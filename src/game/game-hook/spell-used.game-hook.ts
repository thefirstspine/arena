import { IGameHook } from './game-hook.interface';
import { Injectable } from '@nestjs/common';
import { IGameInstance, IGameCard, IGameAction, IGameActionPassed } from '../../@shared/arena-shared/game';
import { IHasGameWorkerService } from '../injections.interface';
import { GameWorkerService } from '../game-worker/game-worker.service';
import { IGameWorker } from '../game-worker/game-worker.interface';

/**
 * This subscriber is executed once a 'card:spell:used' event is thrown. It wil delete old spells actions.
 * @param gameInstance
 * @param params
 */
@Injectable()
export class SpellUsedGameHook implements IGameHook, IHasGameWorkerService {

  public gameWorkerService: GameWorkerService;

  async execute(gameInstance: IGameInstance, params: {gameCard: IGameCard}): Promise<boolean> {
    // Add strength to the Insane's Echo card
    gameInstance.cards
      .filter((card: IGameCard) => card.location === 'board' && card.user === params.gameCard.user && card.card.id === 'insanes-echo')
      .forEach((card: IGameCard) => {
        card.currentStats.bottom.strength += 2;
        card.currentStats.left.strength += 2;
        card.currentStats.right.strength += 2;
        card.currentStats.top.strength += 2;
      });

    // Get the spells in the hand & delete the associated actions
    gameInstance.cards
      .filter((card: IGameCard) => card.location === 'hand' && card.user === params.gameCard.user && card.card.type === 'spell')
      .forEach((card: IGameCard) => {
        const actions: IGameAction[] = gameInstance.actions.current.filter((a: IGameAction) => a.type === `spell-${card.card.id}`);
        actions.forEach((action: IGameAction) => {
          if (action.type === `spell-${params.gameCard.id}`) {
            // Skip to delete that spell
            return;
          }
          gameInstance.actions.current = gameInstance.actions.current.filter((a: IGameAction) => a !== action);
          gameInstance.actions.previous.push({
            ...action,
            passedAt: Date.now(),
          });
        });
      });

    // Count ether used in that turn
    const actionsAfterThrowIndex: number = gameInstance.actions.previous.reverse().findIndex((a: IGameActionPassed) => a.type === 'throw-cards');
    const actionsAfterThrow: IGameActionPassed[] = gameInstance.actions.previous.slice(0, actionsAfterThrowIndex + 1);
    const etherUsed: number = actionsAfterThrow
      .filter((a) => a.type === 'spell-ether' && a.responses)
      .length + (params.gameCard.card.id === 'ether' ? 1 : 0); // +1 for an ether used now, since the action is not passed yet

    // Count spell used in that turn
    const spellUsed: number = actionsAfterThrow
      .filter((a) => a.type !== 'spell-ether' && /^spell-/.test(a.type) && a.responses && a.responses.length)
      .length;

    // Generate actions based ether used
    if ((etherUsed * 2) - spellUsed > 0) {
      const promises: Array<Promise<IGameAction>> = [];
      gameInstance.cards.filter((card: IGameCard) => card.location === 'hand' && card.user === params.gameCard.user && card.card.type === 'spell')
        .forEach((card: IGameCard) => {
          const worker: IGameWorker|undefined = this.gameWorkerService.getWorker(`spell-${card.card.id}`);
          if (worker) {
            promises.push(worker.create(gameInstance, {user: params.gameCard.user}));
          }
        });
      const actions: IGameAction[] = await Promise.all(promises);
      gameInstance.actions.current.push(...actions);
    }

    return true;
  }

}
