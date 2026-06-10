import * as migration_20260610_150905_initial from './20260610_150905_initial';

export const migrations = [
  {
    up: migration_20260610_150905_initial.up,
    down: migration_20260610_150905_initial.down,
    name: '20260610_150905_initial'
  },
];
