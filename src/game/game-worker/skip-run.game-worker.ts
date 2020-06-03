import { IGameWorker } from './game-worker.interface';
import { IGameInstance, IGameAction, IGameCard, ISubActionPass } from '../../@shared/arena-shared/game';
import { Injectable } from '@nestjs/common';
import { GameHookService } from '../game-hook/game-hook.service';
import { IHasGameHookService, IHasGameWorkerService } from '../injections.interface';
import { ArenaRoomsService } from '../../rooms/arena-rooms.service';
import { GameWorkerService } from './game-worker.service';
import { LogsService } from '@thefirstspine/logs-nest';

/**
 * At the beggining of his turn, the player can throw to the discard one or more cards.
 */
@Injectable() // Injectable required here for dependency injection
export class SkipRunGameWorker implements IGameWorker, IHasGameHookService, IHasGameWorkerService {

  public gameHookService: GameHookService;
  public gameWorkerService: GameWorkerService;

  public readonly type: string = 'skip-run';

  constructor(
    private readonly logsService: LogsService,
    private readonly arenaRoomsService: ArenaRoomsService,
  ) {}

  /**
   * @inheritdoc
   */
  public async create(gameInstance: IGameInstance, data: {user: number}): Promise<IGameAction<ISubActionPass>> {
    return {
      createdAt: Date.now(),
      type: this.type,
      name: {
        en: ``,
        fr: `Passer la course`,
      },
      description: {
        en: ``,
        fr: `Vous pouvez passer la course.`,
      },
      user: data.user as number,
      priority: 2,
      expiresAt: Date.now() + (30 * 1000), // expires in 30 seconds
      interaction: {
        type: 'pass',
        description: {
          en: ``,
          fr: `Passer la course`,
        },
        params: {},
      },
    };
  }

  /**
   * @inheritdoc
   */
  public async execute(gameInstance: IGameInstance, gameAction: IGameAction<ISubActionPass>): Promise<boolean> {
    // Deletes the action "run"
    gameInstance.actions.current.forEach((currentGameAction: IGameAction<any>) => {
      if (currentGameAction.type === 'run') {
        this.gameWorkerService.getWorker(currentGameAction.type).delete(gameInstance, currentGameAction);
      }
    });

    return true;
  }

  /**
   * Default refresh method
   * @param gameInstance
   * @param gameAction
   */
  public async refresh(gameInstance: IGameInstance, gameAction: IGameAction<ISubActionPass>): Promise<void> {
    return;
  }

  /**
   * On expiration, do not throw cards
   * @param gameInstance
   * @param gameAction
   */
  public async expires(gameInstance: IGameInstance, gameAction: IGameAction<ISubActionPass>): Promise<boolean> {
    gameAction.response = [];
    return true;
  }

  /**
   * Default delete method
   * @param gameInstance
   * @param gameAction
   */
  public async delete(gameInstance: IGameInstance, gameAction: IGameAction<ISubActionPass>): Promise<void> {
    // The next "throw-cards" game action should have more time
    const action: IGameAction<any>|undefined = gameInstance.actions.current.find((a: IGameAction<any>) => a.type === 'throw-cards');
    if (action) {
      action.expiresAt = Date.now() + (30 * 1000); // expires in 30 seconds
    }

    gameInstance.actions.current = gameInstance.actions.current.filter((gameActionRef: IGameAction<ISubActionPass>) => {
      if (gameActionRef === gameAction) {
        gameInstance.actions.previous.push({
          ...gameAction,
          passedAt: Date.now(),
        });
        return false;
      }
      return true;
    });
  }
}
