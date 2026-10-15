// Shared Socket.IO event name constants, used by both client and server.

export const ClientEvents = {
  CreateRoom: 'room:create',
  JoinRoom: 'room:join',
  LeaveRoom: 'room:leave',
  SetReady: 'player:setReady',
  StartGame: 'host:startGame',
  RestartGame: 'host:restartGame',
  UpdateSettings: 'host:updateSettings',
  KickPlayer: 'host:kickPlayer',
  AddBot: 'host:addBot',
  SetBotLevel: 'host:setBotLevel',
  AnswerBotRebuy: 'host:answerBotRebuy',
  SetSittingOut: 'player:setSittingOut',
  SideBetPick: 'player:sideBetPick',
  Throw: 'player:throw',
  Rebuy: 'player:rebuy',
  PlayerAction: 'game:action',
  UseTimeBank: 'player:useTimeBank',
  SendChat: 'chat:send',
  SendEmote: 'chat:emote',
} as const;

export const ServerEvents = {
  RoomJoined: 'room:joined',
  RoomError: 'room:error',
  StateUpdate: 'game:state',
  ChatMessage: 'chat:message',
  EmoteBroadcast: 'chat:emoteBroadcast',
  ThrowBroadcast: 'player:throwBroadcast',
  PlayerJoinedToast: 'room:playerJoined',
  PlayerLeftToast: 'room:playerLeft',
  Kicked: 'host:kicked',
  HandWinners: 'game:handWinners',
  Error: 'error',
} as const;
