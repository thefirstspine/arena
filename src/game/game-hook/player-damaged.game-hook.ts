import { IGameHook } from './game-hook.interface';
import { Injectable } from '@nestjs/common';
import { IGameInstance, IGameUser, IGameResult, IGameCard, IWizard, IWizardHistoryItem } from '@thefirstspine/types-arena';
import { WizzardsStorageService } from '../../storage/wizzards.storage.service';
import { WizzardService } from '../../wizard/wizard.service';
import { ILoot } from '@thefirstspine/types-rest';
import { mergeLootsInItems } from '../../utils/game.utils';
import { LogsService } from '@thefirstspine/logs-nest';
import { MessagingService } from '@thefirstspine/messaging-nest';
import { Modifiers } from '../modifiers';
import { QuestService } from '../../wizard/quest/quest.service';
import { TriumphService } from '../../wizard/triumph/triumph.service';

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
    private readonly questService: QuestService,
    private readonly messagingService: MessagingService,
    private readonly logsService: LogsService,
    private readonly triumphService: TriumphService,
  ) {}

  async execute(gameInstance: IGameInstance, params: {gameCard: IGameCard, source: IGameCard, lifeChanged: number}): Promise<boolean> {
    if (params.gameCard && params.gameCard.currentStats.life <= 0
       && gameInstance.status === 'active') { // Guard here in case of multiple hook called
      // TODO: In a game instance with more than two player this does NOT work
      // Get the players
      const losers: IGameUser[] = gameInstance.users.filter((u: IGameUser) => u.user === params.gameCard.user);
      const winners: IGameUser[] = gameInstance.users.filter((u: IGameUser) => u.user !== params.gameCard.user);

      // Get aditionnal triumphs based on opponents
      const additionalTriumphs: string[] = [];
      if (losers.find((user: IGameUser) => user.user === 933)) {
        additionalTriumphs.push('silentist');
      }
      if (losers.find((user: IGameUser) => user.user === 934)) {
        additionalTriumphs.push('predator');
      }
      if (losers.find((user: IGameUser) => user.user === 935)) {
        additionalTriumphs.push('constructor');
      }
      if (losers.find((user: IGameUser) => user.user === 1141)) {
        additionalTriumphs.push('poacher');
      }

      // Generate results & register history
      const result: IGameResult[] = [];
      losers.forEach((gameUser: IGameUser) => {
        const loots: ILoot[] = [];
        if (gameInstance.modifiers.includes(Modifiers.GOLDEN_GALLEONS)) {
          loots.push({
            name: 'golden-galleon',
            num: gameInstance.cards
              .filter((c: IGameCard) => c.user === gameUser.user && c.location === 'hand' && c.card.id === 'golden-galleon').length,
          });
        }
        if (gameInstance.modifiers.includes(Modifiers.TRICK_OR_TREAT)) {
          loots.push({
            name: 'candy-shard',
            num: gameInstance.cards.find((c: IGameCard) => c.user === gameUser.user && c.card.type === 'player').metadata?.candyShards,
          });
        }
        this.registerResult(
          false,
          gameUser,
          gameInstance,
          loots,
          result,
          []);
      });

      winners.forEach((gameUser: IGameUser) => {
        const loots: ILoot[] = [];
        if (gameInstance.modifiers.includes(Modifiers.GOLDEN_GALLEONS)) {
          loots.push({
            name: 'golden-galleon',
            num: gameInstance.cards
              .filter((c: IGameCard) => c.user === gameUser.user && c.location === 'hand' && c.card.id === 'golden-galleon').length,
          });
        }
        if (gameInstance.modifiers.includes(Modifiers.TRICK_OR_TREAT)) {
          loots.push({
            name: 'candy-shard',
            num: gameInstance.cards.find((c: IGameCard) => c.user === gameUser.user && c.card.type === 'player').metadata?.candyShards,
          });
        }
        this.registerResult(
          true,
          gameUser,
          gameInstance,
          loots,
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
    const wizard: IWizard = this.wizzardService.getOrCreateWizzard(gameUser.user);

    if (victory) {
      loot.push({name: 'victory-mark', num: 1});
      this.questService.progressQuestOnWizard(
        wizard,
        'win',
        1);
    } else {
      loot.push({name: 'defeat-mark', num: 1});
    }

    if (gameInstance.modifiers.includes(Modifiers.IMMEDIATE)) {
      if (victory) {
        loot.push({name: 'shard', num: 30});
      } else {
        loot.push({name: 'shard', num: 10});
      }
    }

    if (gameInstance.modifiers.includes(Modifiers.DAILY)) {
      const gamesOfTheDay: IWizardHistoryItem[] = wizard.history.filter((h) => {
        const today: Date = new Date();
        const todayStr: string = today. getFullYear() + '-' + (today. getMonth() + 1) + '-' + (today.getDate());
        const gameDate: Date = new Date(h.timestamp);
        const gameDateStr: string = gameDate. getFullYear() + '-' + (gameDate. getMonth() + 1) + '-' +  (gameDate.getDate());
        return todayStr === gameDateStr;
      });
      const mutiplier: number = gamesOfTheDay.length === 0 ? 2 : 1;
      if (victory) {
        loot.push({name: 'shard', num: 30 * mutiplier});
      } else {
        loot.push({name: 'shard', num: 10 * mutiplier});
      }
    }

    if (gameInstance.modifiers.includes(Modifiers.CYCLE)) {
      if (victory) {
        loot.push({name: 'shard', num: 60});
      }
    }

    if (
      gameInstance.modifiers.includes(Modifiers.CYCLE) &&
      gameInstance.modifiers.includes(Modifiers.GREAT_ANCIENTS_EGGS)
    ) {
      loot.push({name: 'great-ancient-mark', num: 1});
      if (victory) {
        loot.push({name: 'holo-great-ancient-egg', num: 1}, {name: 'premium-great-ancient-egg', num: 1});
      } else {
        loot.push({name: 'holo-great-ancient-egg', num: 1});
      }
    }

    if (
      gameInstance.modifiers.includes(Modifiers.CYCLE) &&
      gameInstance.modifiers.includes(Modifiers.SOUVENIRS_FROM_YOUR_ENEMY)
    ) {
      loot.push({name: 'souvenirs-mark', num: 1});
      if (victory) {
        loot.push(
          {name: 'holo-conjurer-souvenir', num: 1},
          {name: 'holo-summoner-souvenir', num: 1},
          {name: 'holo-sorcerer-souvenir', num: 1},
          {name: 'holo-hunter-souvenir', num: 1},
        );
      } else {
        loot.push(
          {name: 'holo-conjurer-souvenir', num: 1},
          {name: 'premium-conjurer-souvenir', num: 1},
          {name: 'holo-summoner-souvenir', num: 1},
          {name: 'premium-summoner-souvenir', num: 1},
          {name: 'holo-sorcerer-souvenir', num: 1},
          {name: 'premium-sorcerer-souvenir', num: 1},
          {name: 'holo-hunter-souvenir', num: 1},
          {name: 'premium-hunter-souvenir', num: 1},
        );
      }
    }

    if (
      gameInstance.modifiers.includes(Modifiers.CYCLE) &&
      gameInstance.modifiers.includes(Modifiers.GOLDEN_GALLEONS)
    ) {
      loot.push({name: 'treasure-mark', num: 1});
      if (victory) {
        loot.push({name: 'holo-golden-galleon', num: 1}, {name: 'premium-golden-galleon', num: 1});
      } else {
        loot.push({name: 'holo-golden-galleon', num: 1});
      }
    }

    if (
      gameInstance.modifiers.includes(Modifiers.CYCLE) &&
      gameInstance.modifiers.includes(Modifiers.ANNIHILATION_MATTS)
    ) {
      loot.push({name: 'souls-mark', num: 1});
      if (victory) {
        loot.push({name: 'holo-annihilation-matt', num: 1}, {name: 'premium-annihilation-matt', num: 1});
      } else {
        loot.push({name: 'holo-annihilation-matt', num: 1});
      }
    }

    if (
      gameInstance.modifiers.includes(Modifiers.CYCLE) &&
      gameInstance.modifiers.includes(Modifiers.HARVESTING_SOULS)
    ) {
      loot.push({name: 'harvester-mark', num: 1});
      if (victory) {
        loot.push({name: 'holo-blood-strength', num: 1}, {name: 'premium-blood-strength', num: 1});
      } else {
        loot.push({name: 'holo-blood-strength', num: 1});
      }
    }

    if (
      gameInstance.modifiers.includes(Modifiers.CYCLE) &&
      gameInstance.modifiers.includes(Modifiers.FROZEN_STATUES)
    ) {
      loot.push({name: 'snow-mark', num: 1});
      if (victory) {
        loot.push({name: 'holo-ice-statue', num: 1}, {name: 'premium-ice-statue', num: 1});
        loot.push({name: 'holo-frozen-fox', num: 1}, {name: 'premium-frozen-fox', num: 1});
        loot.push({name: 'holo-frozen-viper', num: 1}, {name: 'premium-frozen-viper', num: 1});
        loot.push({name: 'holo-frozen-banshee', num: 1}, {name: 'premium-frozen-banshee', num: 1});
      } else {
        loot.push({name: 'holo-ice-statue', num: 1});
        loot.push({name: 'holo-frozen-fox', num: 1});
        loot.push({name: 'holo-frozen-viper', num: 1});
        loot.push({name: 'holo-frozen-banshee', num: 1});
      }
    }

    // Register data in wizard's history
    const historyItem: IWizardHistoryItem = {
      gameId: gameInstance.id,
      gameTypeId: gameInstance.gameTypeId,
      victory,
      timestamp: Date.now(),
    };
    wizard.history.push(historyItem);
    this.logsService.info(`Register history to user #${gameUser.user}`, historyItem);

    // Add loot
    mergeLootsInItems(wizard.items, loot);
    this.messagingService.sendMessage([wizard.id], 'TheFirstSpine:loot', loot);

    if (!victory) {
      // Register the triumph "spirit"
      this.triumphService.unlockTriumphOnWizard(wizard, 'spirit');
    } else {
      // Register the triumphs for the destiny & the origin
      this.triumphService.unlockTriumphOnWizard(wizard, gameUser.origin);
      this.triumphService.unlockTriumphOnWizard(wizard, gameUser.destiny);
    }

    // Register triumph for FPE
    if (gameInstance.gameTypeId === 'fpe') {
      this.triumphService.unlockTriumphOnWizard(wizard, 'wizzard');
    }

    // Register other triumphs
    additionalTriumphs.forEach((t: string) => {
      this.triumphService.unlockTriumphOnWizard(wizard, t);
    });

    // Save wizard
    this.messagingService.sendMessage([wizard.id], 'TheFirstSpine:account', wizard);
    this.wizzardsStorageService.save(wizard);
    this.logsService.info(`Wizard #${gameUser.user} saved`, wizard);

    result.push({
      user: gameUser.user,
      result: victory ? 'win' : 'lose',
      loot,
    });
  }

}
