export enum GameRoomEvents {
    JoinGame = 'joinGame',
    AvatarUpdate = 'avatarUpdate',
    RoomUpdate = 'roomUpdateResponse',
    KickPlayer = 'kickPlayer',
    ToggleLock = 'toggleLock',
    AddVirtualPlayer = 'addVirtualPlayer',
    KickUpdate = 'kickUpdate',
    StartGame = 'startGame',
}

export enum ActiveGameEvents {
    CombatStarted = 'combatStarted',
    CombatInitiated = 'combatInitiated',
    CombatAction = 'combatAction',
    CombatUpdate = 'combatUpdate',
    MovePlayer = 'movePlayer',
    PlayerNextPosition = 'playerNextPosition',
    PlayerStartedMoving = 'playerStartedMoving',
    PlayerStoppedMoving = 'PlayerStoppedMoving',
    TurnUpdate = 'turnUpdate',
    NextTurn = 'nextTurn',
    NoMorePlayers = 'noMorePlayers',
    PlayerDisconnect = 'playerDisconnect',
    ToggledDoor = "toggledDoor",
    DoorUpdate = 'doorUpdated',
    FetchStats = 'fetchStats',
    GameEnded = 'gameEnded',
    MapRequest = 'mapRequest',
    ItemSwapped = 'itemSwapped',
    ItemUpdate = 'itemUpdate',
    ItemsDropped = "itemsDropped",
    ResetInventory = "resetInventory",
    ItemPickedUp = 'itemPickedUp',
}

export enum ChatEvents{
    SendMessage = 'sendMessage',
    GiveMessages = 'GiveMessages',
    RetrieveMessages = 'RetrieveMessages',
    ReceiveMessage = 'receiveMessage'
}

export enum GlobalChatEvents{
    SendGlobalMessage = 'sendGlobalMessage',
    ReceiveGlobalMessage = 'receiveGlobalMessage',
    RetrieveGlobalMessages = 'retrieveGlobalMessages',
    GiveGlobalMessages = 'giveGlobalMessages'
}

export enum TimerEvents{
    StartTimer = 'start-timer',
    StopTimer = 'stop-timer',
    TimerUpdate = 'timer-update',
    TimerEnd = 'timer-end',
    ResetTimer = 'reset-timer',
}

export enum DebugEvents {
    ToggleDebug = 'debug',
}

export enum CTFEvents {
    FlagTaken = 'flagTaken',
    FlagDropped = 'flagDropped',
    FlagCaptured = 'flagCaptured',
}
