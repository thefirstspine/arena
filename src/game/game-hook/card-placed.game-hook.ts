import { IGameHook } from './game-hook.interface';
import { Injectable } from '@nestjs/common';
import { IGameInstance, IGameCard } from '@thefirstspine/types-arena';
import { QuestService } from '../../wizard/quest/quest.service';

/**
 * This subscriber is executed once a 'card:placed' event is thrown.
 * @param gameInstance
 * @param params
 */
@Injectable()
export class CardPlacedGameHook implements IGameHook {

  constructor(
    private readonly questService: QuestService,
  ) {}

  async execute(gameInstance: IGameInstance, params: {gameCard: IGameCard}): Promise<boolean> {
    if (params.gameCard.card.type === 'creature') {
      await this.questService.progressQuest(
        params.gameCard.user,
        'play:creatures',
        1);
      await this.questService.progressQuest(
        params.gameCard.user,
        'play:creaturesOrArtifacts',
        1);
    }
    if (params.gameCard.card.type === 'artifact') {
      await this.questService.progressQuest(
        params.gameCard.user,
        'play:artifacts',
        1);
      await this.questService.progressQuest(
        params.gameCard.user,
        'play:creaturesOrArtifacts',
        1);
    }
    return true;
  }

}
