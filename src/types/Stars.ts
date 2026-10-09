export type Star = {
	id: string; // 英文ID
	cn: string; // 中文名
	raDeg: number; // J2000 RA (度)
	decDeg: number; // J2000 Dec (度)
	mag?: number;
	kind?: 'star' | 'cluster';
};

export type Asterism = {
	id: string;
	cn: string;
	members: string[]; // 用 star.id 列成员
	edges?: [string, string][];
};
