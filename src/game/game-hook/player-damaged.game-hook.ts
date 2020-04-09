import { IGameHook } from './game-hook.interface';
import { Injectable } from '@nestjs/common';
import { IGameInstance, IGameUser, IGameResult, IGameCard } from '../../@shared/arena-shared/game';
import { WizzardsStorageService } from '../../storage/wizzards.storage.service';
import { WizzardService } from '../../wizzard/wizzard.service';
import { ILoot } from '../../@shared/rest-shared/entities';
import { IWizzard, IHistoryItem } from '../../@shared/arena-shared/wizzard';
import { mergeLootsInItems } from '../../utils/game.utils';
import { RestService } from '../../rest/rest.service';
import { MessagingService } from '../../@shared/messaging-shared/messaging.service';
import { LogService } from '../../@shared/log-shared/log.service';

/**
 * This subscriber is executed once a 'card:lifeChanged:damaged:{player}' event is thrown and look for dead
 * players.
 * @param gameInstance
 * @param params
 */
@Injectable()
export class PlayerDamagedGameHook implements IGameHook {

  constructor(
    private readonly wizzardService: WizzardService,
    private readonly wizzardsStorageService: WizzardsStorageService,
    private readonly restService: RestService,
    private readonly messagingService: MessagingService,
    private readonly logsService: LogService,
  ) {}

  async execute(gameInstance: IGameInstance, params: {gameCard: IGameCard, source: IGameCard, lifeChanged: number}): Promise<boolean> {
    if (params.gameCard && params.gameCard.currentStats.life <= 0
       && gameInstance.status === 'active') { // Guard here in case of multiple hook called
      // TODO: In a game instance with more than two player this does NOT work
      // Get the players
      const losers: IGameUser[] = gameInstance.users.filter((u: IGameUser) => u.user === params.gameCard.user);
      const winners: IGameUser[] = gameInstance.users.filter((u: IGameUser) => u.user !== params.gameCard.user);

      // Get the game type
      const gameType = await this.restService.gameType(gameInstance.gameTypeId);

      // Get aditionnal triumphs based on opponents
      const additionalTriumphs: string[] = [];
      if (losers.find((user: IGameUser) => user.user === 933)) {
        additionalTriumphs.push('silentist');
      }
      if (losers.find((user: IGameUser) => user.user === 934)) {
        additionalTriumphs.push('predator');
      }

      // Generate results & register history
      const result: IGameResult[] = [];
      losers.forEach((gameUser: IGameUser) => {
        this.registerResult(
          false,
          gameUser,
          gameInstance,
          gameType.loots.defeat,
          result,
          []);
      });

      winners.forEach((gameUser: IGameUser) => {
        this.registerResult(
          true,
          gameUser,
          gameInstance,
          gameType.loots.victory,
          result,
          additionalTriumphs);
      });

      // Register result
      gameInstance.result = result;

      // Close the instance
      gameInstance.status = 'ended';
    }

    return true;
  }

  /**
   * Register a result in the game & in the wizzard
   * @param victory
   * @param gameUser
   * @param gameInstance
   * @param result
   * @param wizzardService
   * @param wizzardsStorageService
   */
  protected registerResult(
    victory: boolean,
    gameUser: IGameUser,
    gameInstance: IGameInstance,
    loot: ILoot[],
    result: IGameResult[],
    additionalTriumphs: string[],
  ) {
    // Get wizard's account
    const wizzard: IWizzard = this.wizzardService.getWizzard(gameUser.user);

    // Register data in wizard's history
    const historyItem: IHistoryItem = {
      gameId: gameInstance.id,
      gameTypeId: gameInstance.gameTypeId,
      victory,
      timestamp: Date.now(),
    };
    wizzard.history.push(historyItem);
    this.logsService.info(`Register history to user #${gameUser.user}`, historyItem);

    // Add loot
    mergeLootsInItems(wizzard.items, loot);

    if (!victory) {
      // Register the triumph "spirit"
      if (!wizzard.triumphs.includes('spirit')) {
        wizzard.triumphs.push('spirit');
      }
    } else {
      // Register the triumphs for the destiny & the origin
      if (gameUser.destiny && !wizzard.triumphs.includes(gameUser.destiny)) {
        wizzard.triumphs.push(gameUser.destiny);
      }
      if (gameUser.origin && !wizzard.triumphs.includes(gameUser.origin)) {
        wizzard.triumphs.push(gameUser.origin);
      }
    }

    // Register triumph for FPE
    if (gameInstance.gameTypeId === 'fpe' && !wizzard.triumphs.includes('wizzard')) {
      wizzard.triumphs.push('wizzard');
    }

    // Register other triumphs
    additionalTriumphs.forEach((t: string) => {
      if (!wizzard.triumphs.includes(t)) {
        wizzard.triumphs.push(t);
      }
    });

    // Save wizard
    this.messagingService.sendMessage([wizzard.id], 'TheFirstSpine:account', wizzard);
    this.wizzardsStorageService.save(wizzard);
    this.logsService.info(`Wizard #${gameUser.user} saved`, wizzard);

    result.push({
      user: gameUser.user,
      result: victory ? 'win' : 'lose',
      loot,
    });
  }

}
