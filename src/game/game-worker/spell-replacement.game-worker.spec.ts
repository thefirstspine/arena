import { Test, TestingModule } from '@nestjs/testing';
import { GameWorkerService } from './game-worker.service';
import { ApiService } from '../../api/api.service';
import { GameService } from '../game.service';
import { QueueService } from '../../queue/queue.service';
import { TickerService } from '../../ticker/ticker.service';
import { WizardService } from '../../wizard/wizard.service';
import { ShopService } from '../../shop/shop.service';
import { RestService } from '../../rest/rest.service';
import { RoomsService } from '../../rooms/rooms.service';
import { ArenaRoomsService } from '../../rooms/arena-rooms.service';
import { GameHookService } from '../game-hook/game-hook.service';
import { BotsService } from '../../bots/bots.service';
import { IGameInstance, IGameAction, IInteractionPutCardOnBoard } from '@thefirstspine/types-arena';
import { AuthService } from '@thefirstspine/auth-nest';
import { LogsService } from '@thefirstspine/logs-nest';
import { MessagingService } from '@thefirstspine/messaging-nest';

describe('Spell replacement', () => {
  let gameWorkerService: GameWorkerService;
  let restService: RestService;
  let roomsService: RoomsService;

  /**
   * ======================================================================
   * INIT TESTS AND DEPENDENCIES
   * ======================================================================
   */

  beforeEach(async () => {
    require('dotenv').config();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiService,
        GameService,
        QueueService,
        TickerService,
        WizardService,
        ShopService,
        AuthService,
        LogsService,
        RestService,
        RoomsService,
        ArenaRoomsService,
        MessagingService,
        GameWorkerService,
        GameHookService,
        BotsService,
      ],
    }).compile();

    gameWorkerService = module.get<GameWorkerService>(GameWorkerService);
    restService = module.get<RestService>(RestService);
    roomsService = module.get<RoomsService>(RoomsService);
  });

  /**
   * ======================================================================
   * TEST SERVICE CREATION
   * ======================================================================
   */

  it('should be defined', () => {
    expect(gameWorkerService).toBeDefined();
    expect(restService).toBeDefined();
    expect(roomsService).toBeDefined();
  });

  /**
   * ======================================================================
   * CREATE ROOM
   * ======================================================================
   */

  test('room creation', async () => {
    try {
      await roomsService.createRoom('arena', {
        name: 'game-0',
        senders: [],
      });
    } catch (e) {
      // Do nothing
    }
  });

  /**
   * ======================================================================
   * TEST REPLACEMENT SPELL GAME WORKER ON SIMPLE CARD
   * ======================================================================
   */

  test('replacement on simple card', async () => {
    // Get base cards
    const replacementCard = await restService.card('replacement');
    const towerCard = await restService.card('the-tower');
    const bansheeCard = await restService.card('banshee');
    expect(replacementCard).toBeDefined();
    expect(towerCard).toBeDefined();
    expect(bansheeCard).toBeDefined();

    // Create game instance
    const gameInstance: IGameInstance = {
      ...getDefaultGameInstance(),
      cards: [],
    };

    // Add the cards
    gameInstance.cards.push({
      id: '',
      card: replacementCard,
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: towerCard,
      user: gameInstance.users[0].user,
      location: 'board',
      coords: {
        x: 3,
        y: 3,
      },
      currentStats: {
        ...towerCard.stats,
      },
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      user: gameInstance.users[0].user,
      location: 'board',
      coords: {
        x: 3,
        y: 2,
      },
      currentStats: {
        ...bansheeCard.stats,
      },
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      user: gameInstance.users[0].user,
      location: 'hand',
      currentStats: {
        ...bansheeCard.stats,
      },
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      user: gameInstance.users[0].user,
      location: 'hand',
      currentStats: {
        ...bansheeCard.stats,
      },
    });

    // Create game action & add it to the instance
    const gameAction: IGameAction<any> =
      await gameWorkerService.getWorker('spell-replacement').create(gameInstance, {user: gameInstance.users[0].user});
    gameAction.response = {handIndex: 0, boardCoords: '3-3'};
    gameInstance.actions.current.push(gameAction);
    expect(gameAction.interaction.type).toBe('putCardOnBoard');
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords).toBeDefined();
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords.length).toBe(2);
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords[0]).toBe('3-3');
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords[1]).toBe('3-2');
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.handIndexes).toBeDefined();
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.handIndexes.length).toBe(1);
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.handIndexes[0]).toBe(0);

    // Execute
    const result: boolean = await gameWorkerService.getWorker('spell-replacement').execute(
      gameInstance,
      gameAction,
    );

    // Delete the action (we do that in order to simulate the game service that manually deletes actions)
    await gameWorkerService.getWorker('spell-replacement').delete(
      gameInstance,
      gameAction,
    );

    // Test on result
    expect(result).toBeTruthy();
    expect(gameInstance.cards[1].currentStats).toBeDefined();
    expect(gameInstance.cards[1].currentStats.life).toBe(towerCard.stats.life);
    expect(gameInstance.cards[1].location).toBe('discard');
    expect(gameInstance.cards[0].location).toBe('discard');

    // Test on action
    expect(gameInstance.actions.current[0]).toBeDefined();
    expect(gameInstance.actions.current[0].type).toBe('replace-card');
    expect((gameInstance.actions.current[0].interaction as IInteractionPutCardOnBoard).params.handIndexes).toBeDefined();
    expect((gameInstance.actions.current[0].interaction as IInteractionPutCardOnBoard).params.handIndexes.includes(0)).toBeTruthy();
    expect((gameInstance.actions.current[0].interaction as IInteractionPutCardOnBoard).params.boardCoords.includes('3-3')).toBeTruthy();
  });

  /**
   * ======================================================================
   * TEST REPLACEMENT SPELL GAME WORKER ON CARD WITH CARD THAT HAS BURDEN EARTH
   * ======================================================================
   */

  test('replacement on card with burden earth', async () => {
    // Get base cards
    const replacementCard = await restService.card('replacement');
    const smokyTotemCard = await restService.card('smoky-totem');
    const bansheeCard = await restService.card('banshee');
    expect(replacementCard).toBeDefined();
    expect(smokyTotemCard).toBeDefined();
    expect(bansheeCard).toBeDefined();

    // Create game instance
    const gameInstance: IGameInstance = {
      ...getDefaultGameInstance(),
      cards: [],
    };

    // Add the cards
    gameInstance.cards.push({
      id: '',
      card: replacementCard,
      user: gameInstance.users[0].user,
      location: 'hand',
    });
    gameInstance.cards.push({
      id: '',
      card: smokyTotemCard,
      user: gameInstance.users[0].user,
      location: 'board',
      coords: {
        x: 3,
        y: 3,
      },
      currentStats: {
        ...smokyTotemCard.stats,
      },
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      user: gameInstance.users[0].user,
      location: 'board',
      coords: {
        x: 3,
        y: 2,
      },
      currentStats: {
        ...bansheeCard.stats,
      },
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      user: gameInstance.users[0].user,
      location: 'hand',
      currentStats: {
        ...bansheeCard.stats,
      },
    });
    gameInstance.cards.push({
      id: '',
      card: bansheeCard,
      user: gameInstance.users[0].user,
      location: 'hand',
      currentStats: {
        ...bansheeCard.stats,
      },
    });

    // Create game action & add it to the instance
    const gameAction: IGameAction<any> =
      await gameWorkerService.getWorker('spell-replacement').create(gameInstance, {user: gameInstance.users[0].user});
    gameAction.response = {handIndex: 0, boardCoords: '3-3'};
    gameInstance.actions.current.push(gameAction);
    expect(gameAction.interaction.type).toBe('putCardOnBoard');
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords).toBeDefined();
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords.length).toBe(2);
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords[0]).toBe('3-3');
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.boardCoords[1]).toBe('3-2');
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.handIndexes).toBeDefined();
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.handIndexes.length).toBe(1);
    expect((gameAction.interaction as IInteractionPutCardOnBoard).params.handIndexes[0]).toBe(0);

    // Execute
    const result: boolean = await gameWorkerService.getWorker('spell-replacement').execute(
      gameInstance,
      gameAction,
    );

    // Delete the action (we do that in order to simulate the game service that manually deletes actions)
    await gameWorkerService.getWorker('spell-replacement').delete(
      gameInstance,
      gameAction,
    );

    // Test on result
    expect(result).toBeTruthy();
    expect(gameInstance.cards[1].currentStats).toBeDefined();
    expect(gameInstance.cards[1].currentStats.life).toBe(smokyTotemCard.stats.life);
    expect(gameInstance.cards[1].location).toBe('discard');
    expect(gameInstance.cards[0].location).toBe('discard');

    // Test on action
    expect(gameInstance.actions.current.length).toBe(0);
  });
});

function getDefaultGameInstance(): IGameInstance {
  return {
    cards: [],
    id: 0,
    gameTypeId: 'testing',
    status: 'active',
    actions: {
      current: [],
      previous: [],
    },
    modifiers: [],
    theme: 'forest',
    users: [
      {destiny: 'hunter', user: Number.MAX_SAFE_INTEGER - 1, origin: null, style: ''},
      {destiny: 'hunter', user: Number.MAX_SAFE_INTEGER - 1, origin: null},
    ],
  };
}
