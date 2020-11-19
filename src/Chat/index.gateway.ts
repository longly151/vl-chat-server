/* eslint-disable no-console */
/* eslint-disable no-underscore-dangle */
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RoomService } from 'src/Room/index.service';
import { HttpService } from '@nestjs/common';
import { UserService } from 'src/User/index.service';
import { Message } from 'src/Room/Message/index.interface';
import _ from 'lodash';

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private httpService: HttpService,
    private roomService: RoomService,
    private readonly userService: UserService
  ) {}

  async findUserByToken (socket) {
    const { token } = socket.handshake.query;
    return this.userService.findOne({ token }, ['_id', 'name', 'role', 'phone']);
  }

  async handleConnection(socket) {
    const { token } = socket.handshake.query;

    /**
     * Authorization
     */
    const headersRequest = {
      'Authorization': `Bearer ${token}`
    };
    const res = await this.httpService.get(
      'https://api.airtravel.cf/v1/auth/me', { headers: headersRequest }
    ).toPromise()
      .then(res => res.data)
      .catch (error => error);
    console.log('-----------------------------------------');

    const { data } = res;
    if (data) {
      /**
       * Create User
       */
      const user: any = await this.userService.findOne({ email: data.email });
      if (user) {
        await this.userService.updateOne(user._id, { lastActiveAt: null, token });
        console.log('[Connected]', user.name, 'connected');
      } else {
        const newUser: any = {};
        newUser.token = token;
        newUser.name = data.fullName;
        newUser.email = data.email;
        newUser.phone = data.phone;
        newUser.avatar = data.avatar;
        newUser.gender = data.gender;
        newUser.role = data.role.name;
        newUser.lastActiveAt = null;
        await this.userService.createOne(newUser);
        console.log('[Created]', newUser.name, 'created');
      }

      // Join Room
      const combinedRoom = await this.roomService.findAll({ filter: { 'users': user._id } });
      await Promise.all(combinedRoom.map((e: any) => {
        socket.join(e._id);
        socket.broadcast.to(e._id).emit('trigger_active', {
          _id: user._id,
          name: user.name,
          lastActiveAt: null
        });
        console.log('[Joined]', data.fullName, 'joined room', e._id);
        return true;
      }));
    } else {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket) {
    const user: any = await this.findUserByToken(socket);
    if (user) {
      const lastActiveAt = new Date();
      await this.userService.updateOne(user._id, { lastActiveAt });
      console.log('[Disconnected]', user.name, 'disconnected');

      // Leave Room
      const combinedRoom = await this.roomService.findAll({ filter: { 'users': user._id } });
      await Promise.all(combinedRoom.map(async (e: any) => {
        socket.leave(e._id);
        // Update currentUsers in Room (DB)
        const result = _.filter(e.currentUsers, (n: any) => {
          return n.toString() !== user._id.toString();
        });
        e.currentUsers = result;

        await this.roomService.updateOne(e._id, e);
        socket.broadcast.to(e._id).emit('trigger_chatting', e.currentUsers);
        socket.broadcast.to(e._id).emit('trigger_typing', e.currentUsers);

        socket.broadcast.to(e._id).emit('trigger_active', {
          _id: user._id,
          name: user.name,
          lastActiveAt
        });
        return true;
      }));
    } else {
      console.log('[Disconnected] Unauthorized User disconnected');
    }
  }

  @SubscribeMessage('chat')
  async onChat(client, data: {
    text: string;
    user: {
      _id: string;
      name?: string;
    },
    location?: {
      latitude: number;
      longitude: number;
    }
    image? : string;
    audio? : string;
    video? : string;
  }): Promise<any> {
    const user: any = await this.findUserByToken(client);
    const { user: receiver } = data;
    console.log('user', user);

    /**
     * Handle Room
     */
    const combinedRoom: any = await this.roomService.findAll({ filter: { 'users': { '$all': [user._id, receiver._id] } } });
    const room = combinedRoom[0];

    // Create New Room for 2 people ==> Move to "chatting"
    // if (_.isEmpty(room)) {
    //   const newMutualRoom: any = {};
    //   newMutualRoom.users = [receiver._id, user._id];
    //   room = await this.roomService.createOne(newMutualRoom);
    //   console.log('[Created] Room', room._id, 'created');
    //   client.join(room._id);
    //   console.log('[Joined]', user.name, 'joined room', room._id);
    // }
    client.join(room._id);
    console.log('[Joined]', user.name, 'joined room', room._id);
    /**
     * Handle Message
     */
    if (room) {
      const newMessage: Message = {
        ...data,
        user: user._id
      };
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const _id = await this.roomService.addMessage(newMessage, room._id);
      const returnedMessage = {
        _id,
        ...newMessage,
        user: {
          _id: user._id,
          name: user.name
        },
        room: room._id,
        createdAt: new Date()
      };
      client.broadcast.to(room._id).emit('chat', returnedMessage);
    }
  }

  async onTriggerRoom(client, data: {
    user: {
      _id: string;
      name?: string;
    },
  }, type: 'chatting' | 'leave_chatting' | 'typing' | 'stop_typing'): Promise<any> {
    const user: any = await this.findUserByToken(client);
    const { user: receiver } = data;

    /**
     * Handle Room
     */
    const combinedRoom: any = await this.roomService.findAll({ filter: { 'users': { '$all': [user._id, receiver._id] } } });
    let room = combinedRoom[0];

    // Notify user on room & save db
    let result: any = null;
    if (!_.isEmpty(room)) {
      switch(type) {
        case 'chatting':
          if (room.currentUsers.indexOf(user._id) === -1) {
            room.currentUsers.push(user._id);
          }
          await this.roomService.updateOne(room._id, room);
          client.broadcast.to(room._id).emit('trigger_chatting', room.currentUsers);
          break;
        case 'leave_chatting':
          result = _.filter(room.currentUsers, (n: any) => n.toString() !== user._id.toString());
          room.currentUsers = result;
          await this.roomService.updateOne(room._id, room);
          client.broadcast.to(room._id).emit('trigger_chatting', room.currentUsers);
          break;
        case 'typing':
          if (room.typingUsers.indexOf(user._id) === -1) {
            room.typingUsers.push(user._id);
          }
          await this.roomService.updateOne(room._id, room);
          client.broadcast.to(room._id).emit('trigger_typing', room.typingUsers);
          break;
        default:
          result = _.filter(room.typingUsers, (n: any) => n.toString() !== user._id.toString());
          room.typingUsers = result;
          await this.roomService.updateOne(room._id, room);
          client.broadcast.to(room._id).emit('trigger_typing', room.typingUsers);
          break;
      }
    } else {
      // Create New Room for 2 people
      const newMutualRoom: any = {};
      newMutualRoom.users = [receiver._id, user._id];
      room = await this.roomService.createOne(newMutualRoom);
      console.log('[Created] Room', room._id, 'created');
      client.join(room._id);
      console.log('[Joined]', user.name, 'joined room', room._id);
    }
  }

  @SubscribeMessage('chatting')
  async onChatting(client, data: {
    user: {
      _id: string;
      name?: string;
    },
  }): Promise<any> {
    return this.onTriggerRoom(client, data, 'chatting');
  }

  @SubscribeMessage('leave_chatting')
  async onLeaveChatting(client, data: {
    user: {
      _id: string;
      name?: string;
    },
  }): Promise<any> {
    return this.onTriggerRoom(client, data, 'leave_chatting');
  }

  @SubscribeMessage('typing')
  async onTyping(client, data: {
    user: {
      _id: string;
      name?: string;
    },
  }): Promise<any> {
    return this.onTriggerRoom(client, data, 'typing');
  }

  @SubscribeMessage('stop_typing')
  async onStopTyping(client, data: {
    user: {
      _id: string;
      name?: string;
    },
  }): Promise<any> {
    return this.onTriggerRoom(client, data, 'stop_typing');
  }

  // @SubscribeMessage('join')
  // async onRoomJoin(client, data: any): Promise<any> {
  //   const user: any = await this.findUserByToken(client);

  //   const room: any = await this.roomService.findOne({ name: data });
  //   console.log('data', data);
  //   console.log('room', room);

  //   // room.users.push(user._id);
  //   // await this.roomService.updateOne(room._id, room);

  //   // Create New Room for 2 people (Combining 2 phone number)
  //   const roomName1 = `${data}_${user.phone}`;
  //   const roomName2 = `${user.phone}_${data}`;
  //   if (!_.isEmpty(room)) {
  //     const mutualRoom1 = await this.roomService.findOne({ name: roomName1 });
  //     const mutualRoom2 = await this.roomService.findOne({ name: roomName2 });
  //     if (mutualRoom1) {
  //       client.join(roomName1);
  //       console.log('[Joined]', user.name, 'joined room', roomName1);
  //     } else if (mutualRoom2) {
  //       client.join(roomName2);
  //       console.log('[Joined]', user.name, 'joined room', roomName2);
  //     } else {
  //       const newMutualRoom: any = {};
  //       newMutualRoom.name = roomName1;
  //       newMutualRoom.users = [room.users[0]._id, user._id];
  //       await this.roomService.createOne(newMutualRoom);
  //       console.log('[Created] Room', roomName1, 'created');
  //       client.join(roomName1);
  //       console.log('[Joined]', user.name, 'joined room', roomName1);
  //     }
  //   }
  // }

  @SubscribeMessage('leave')
  async onRoomLeave(client, data: any) {
    const user: any = await this.findUserByToken(client);
    const room: any = await this.roomService.findOne({ name: data });
    const roomName = `${data}_${user.phone}`;
    if (room) {
      client.leave(roomName);
      console.log('[Leave]', user.name, 'left room', roomName);
    }
  }

  @SubscribeMessage('message')
  async onMessage(client, data: {message: any, room: string}) {
    const event = 'message';
    const user: any = await this.findUserByToken(client);

    const roomName = `${user.phone}_${data.room}`;

    const room: any = await this.roomService.findOne({ name: roomName }, ['_id', 'name']);

    if (room) {
      const newMessage: Message = {
        text: data.message,
        user: user._id
      };
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const _id = await this.roomService.addMessage(newMessage, room._id);
      const returnedMessage = {
        _id,
        text: newMessage.text,
        user: {
          _id: user._id,
          name: user.name
        },
        room: roomName
      };
      client.broadcast.to(roomName).emit(event, returnedMessage);
    }
  }
}
