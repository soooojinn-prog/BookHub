export type User = {
  id: number;
  nickname: string;
};

export type Group = {
  id: number;
  name: string;
  invite_code: string;
  reading_period_days: number;
};

export type Member = {
  user_id: number;
  nickname: string;
  role: string;
  rotation_position: number;
};

export type GroupDetail = Group & {
  members: Member[];
};
