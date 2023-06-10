import {
  API,
  Service,
  Logger,
  AccessoryPlugin,
  CharacteristicValue,
  CharacteristicGetHandler,
  CharacteristicSetHandler,
} from "homebridge";
import { Config } from "./config";

import { HomebridgePlatform } from "./platform";
import { AlarmServer } from "./server";

type AlarmState =
  | "disarmed"
  | "armedStay"
  | "armedAway"
  | "armedNight"
  | "alarmTriggered";

type AlarmTargetState = "armStay" | "armAway" | "armNight" | "disarm";

export class VideofiedAlarmAccessory implements AccessoryPlugin {
  // This property must be existent!!
  public name: string;

  private securitySystemService: Service;
  private cachedAlarmState: AlarmState = "disarmed";
  private cachedAlarmTargetState: AlarmTargetState = "disarm";
  private alarmServer: AlarmServer;

  constructor(
    private readonly platform: HomebridgePlatform,
    private readonly log: Logger,
    private readonly config: Config,
    private readonly api: API
  ) {
    this.alarmServer = new AlarmServer(log, this.handleEvent);

    this.name = this.config.name ?? "Alarm";

    this.securitySystemService = new this.platform.Service.SecuritySystem(
      this.name
    );

    this.securitySystemService
      .getCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState
      )
      .onGet(this.getCurrentState.bind(this));

    this.securitySystemService
      .getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onGet(this.getCurrentTargetState.bind(this))
      .onSet(this.setTargetState.bind(this));
  }

  getServices = (): Service[] => {
    return [this.securitySystemService];
  };

  private getCurrentState: CharacteristicGetHandler = async () => {
    this.log.debug("Getting current state");

    return this.getCurrentStateValue();
  };

  private getCurrentTargetState: CharacteristicGetHandler = async () => {
    this.log.debug("Getting current target state");

    return this.getCurrentTargetStateValue();
  };

  private setTargetState: CharacteristicSetHandler = async (
    value: CharacteristicValue
  ) => {
    this.log.debug(`Setting target state: ${value}`);

    const previousTargetState = this.cachedAlarmTargetState;

    this.cachedAlarmTargetState = (() => {
      switch (value) {
        case this.platform.Characteristic.SecuritySystemTargetState.DISARM:
          return "disarm";
        case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:
          return "armStay";
        case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:
          return "armAway";
        case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
          return "armNight";
        default:
          throw new Error("Invalid target state");
      }
    })();

    this.log.debug(
      `Setting updated alarm target state: ${this.cachedAlarmTargetState}, previous target state: ${previousTargetState}`
    );

    const success = (() => {
      switch (previousTargetState) {
        case "disarm": {
          switch (this.cachedAlarmTargetState) {
            case "disarm":
              // disarm > disarm
              // do nothing
              return true;
            case "armStay":
            case "armAway":
            case "armNight": {
              // disarm > arm
              return this.alarmServer.arm();
            }
          }
        }
        case "armStay":
        case "armAway":
        case "armNight": {
          switch (this.cachedAlarmTargetState) {
            case "disarm": {
              // arm > disarm
              return this.alarmServer.disarm();
            }
            case "armStay":
            case "armAway":
            case "armNight": {
              // arm > arm
              // do nothing
              return true;
            }
          }
        }
      }
    })();

    if (!success) {
      throw new Error("Failed to set alarm state");
    }
  };

  private handleEvent = (eventData: string[]) => {
    const eventType = eventData[0];

    switch (eventType) {
      case "24":
        // armed
        this.cachedAlarmState = "armedAway";
        this.cachedAlarmTargetState = "armAway";
        break;
      case "25":
        // disarmed
        this.cachedAlarmState = "disarmed";
        this.cachedAlarmTargetState = "disarm";
        break;
      case "1":
      case "29":
        this.cachedAlarmState = "alarmTriggered";
        break;
    }

    this.log.debug(`Setting updated alarm state: ${this.cachedAlarmState}`);

    this.securitySystemService
      .getCharacteristic(
        this.platform.Characteristic.SecuritySystemCurrentState
      )
      .updateValue(this.getCurrentStateValue());

    this.log.debug(
      `Setting updated alarm target state: ${this.cachedAlarmTargetState}`
    );

    this.securitySystemService
      .getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .updateValue(this.getCurrentTargetStateValue());
  };

  private getCurrentStateValue = (): CharacteristicValue => {
    switch (this.cachedAlarmState) {
      case "disarmed":
        return this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
      case "armedStay":
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      case "armedAway":
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      case "armedNight":
        return this.platform.Characteristic.SecuritySystemCurrentState
          .NIGHT_ARM;
      case "alarmTriggered":
        return this.platform.Characteristic.SecuritySystemCurrentState
          .ALARM_TRIGGERED;
    }
  };

  private getCurrentTargetStateValue = (): CharacteristicValue => {
    switch (this.cachedAlarmTargetState) {
      case "disarm":
        return this.platform.Characteristic.SecuritySystemTargetState.DISARM;
      case "armStay":
        return this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM;
      case "armAway":
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      case "armNight":
        return this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM;
    }
  };
}
