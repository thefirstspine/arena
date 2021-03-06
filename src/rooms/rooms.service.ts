import { Injectable } from '@nestjs/common';
import fetch, { Response } from 'node-fetch';
import { LogsService } from '@thefirstspine/logs-nest';

/**
 * Service to interact with the TFS' service Rooms. They are public chat
 * rooms built on top of protected subjects.
 */
@Injectable()
export class RoomsService {

  constructor(private readonly logsService: LogsService) {}

  /**
   * Create a room for a subject.
   * @param subject
   * @param room
   */
  async createRoom(subject: string, room: IRoom): Promise<IRoomCreated> {
    return this.sendRequest<IRoomCreated>(
      `subjects/${subject}/rooms`,
      room,
      'post');
  }

  async joinRoom(subject: string, room: string, sender: ISender): Promise<IRoomCreated> {
    return this.sendRequest<IRoomCreated>(
      `subjects/${subject}/rooms/${room}/senders`,
      sender,
      'post');
  }

  async leaveRoom(subject: string, room: string, user: number): Promise<IRoomCreated> {
    return this.sendRequest<IRoomCreated>(
      `subjects/${subject}/rooms/${room}/senders/${user}`,
      null,
      'delete');
  }

  async sendMessageToRoom(subject: string, room: string, message: IMessage): Promise<IMessageCreated> {
    return this.sendRequest<IMessageCreated>(
      `subjects/${subject}/rooms/${room}/messages/secure`,
      message,
      'post');
  }

  /**
   * Send a request to the Room's API
   * @param endpoint
   * @param data
   * @param method
   */
  protected async sendRequest<T>(endpoint: string, data: any, method: 'get'|'post'|'delete' = 'get'): Promise<T|null> {
    this.logsService.info('Send message to room service', {endpoint, data});
    const url: string = `${process.env.ROOMS_URL}/api/${endpoint}`;
    const response: Response = await fetch(url, {
      body: data ? JSON.stringify(data) : undefined,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Cert': Buffer.from(process.env.ROOMS_PUBLIC_KEY.replace(/\\n/gm, '\n')).toString('base64'),
      },
    });
    const jsonResponse: any = await response.json();
    if (response.status >= 400) {
      this.logsService.error('Error from rooms service', jsonResponse);
      return null;
    }
    this.logsService.info('Response from rooms service', jsonResponse);
    return jsonResponse as T;
  }

}

export interface IRoom {
  name: string;
  senders: ISender[];
}

export interface IRoomCreated extends IRoom {
  senders: ISenderCreated[];
  timestamp: number;
}

export interface ISender {
  user: number;
  displayName: string;
}

export interface ISenderCreated extends ISender {
  timestamp: number;
}

export interface IMessage {
  message: string;
  user: number;
}

export interface IMessageCreated extends IMessage {
  timestamp: number;
}
