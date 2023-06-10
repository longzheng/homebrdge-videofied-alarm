import { PlatformConfig } from 'homebridge';

export type Config = {
} & Pick<PlatformConfig, 'platform' | 'name' | 'bridge'>;
