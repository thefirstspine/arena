import { Injectable } from '@nestjs/common';
import fetch, { Response } from 'node-fetch';
import env from '../@shared/env-shared/env';

@Injectable()
export class MessagingService {

  static readonly SUBJECT__QUEUE: string = 'TheFirstSpine:queue';
  static readonly SUBJECT__GAME: string = 'TheFirstSpine:game';

  async sendMessage(to: number[]|'*', subject: string|'*', message: any): Promise<IMessagingResponse> {
    const response: Response = await fetch(env.config.MESSAGING_INTERNAL_URL + '/api', {
      body: JSON.stringify({
        to,
        subject,
        message,
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization':
          `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.` +
          `eyJ1c2VybmFtZSI6InRlc3QiLCJzdWIiOjEsImlhdCI6MTU2ODEwNzU1NiwiZXhwIjoxNjk0MzM3OTU2fQ.` +
          `fhG27r-mjxcOv-guWyWVCvWQy6dNguhpHAinL8Wxv6w`,
      },
    });
    const jsonResponse = await response.json();
    return jsonResponse;
  }

}

export interface IMessagingResponse {
  sent: boolean;
  error?: string;
}
