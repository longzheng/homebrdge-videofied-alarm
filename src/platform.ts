import {
  API,
  StaticPlatformPlugin,
  Logger,
  PlatformConfig,
  Service,
  Characteristic,
  AccessoryPlugin,
} from 'homebridge';

import { VideofiedAlarmAccessory } from './platformAccessory';
import { Config } from './config';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HomebridgePlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback([
      new VideofiedAlarmAccessory(
        this,
        this.log,
        this.config as Config,
        this.api,
      ),
    ]);
  }
}
