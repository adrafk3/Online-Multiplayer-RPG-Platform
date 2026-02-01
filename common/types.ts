export type Game = {
    _id: string;
    name: string;
    description: string;
    gameMode: string;
    isHidden: boolean;
    gridSize: number;
    imagePayload: string;
    lastModified: string;
};

export type Position = {
    x: number;
    y: number
}

export type AccountType = {
    username: string;
    email: string;
    avatar: string;
    uid: string;
    trophies?: number;
    classicWins?: number;
    classicLosses?: number;
    ctfWins?: number;
    ctfLosses?: number;
    createdAt?: Date;
    lastLoginAt?: Date;
}

export type AuthResult = {
    user?: User;
    error?: string;
}

export type User = {
    uid: string;
    email: string | null;
    displayName?: string | null;
}

export type GlobalChatMessage = {
    username: string;
    content: string;
    timestamp: string;
}