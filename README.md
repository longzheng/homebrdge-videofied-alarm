# homebridge-videofied-alarm
Homebridge plugin for controlling Videofied alarm systems

- Simulates a Frontel alarm server (requires panel configuration)
- Supports arming/disarming from Homekit (only when panel is connected to server)
- Supports updating armed/disarmed status
- Supports alarm triggering

## Install
```
npm i -g homebridge-videofied-alarm
```

## Homebridge config
```
    "platforms": [
        {
            "platform": "VideofiedAlarm",
            "name": "Home alarm"
        }
```

## Frontel alarm server
This plugin simulates a Frontel alarm server inspired by the Home Assistant plugin [rsi-alarm-gateway](https://github.com/Mickaelh51/rsi-alarm-gateway) and reverse engineering of the Frontel protocol by [Cybergibbsons](https://cybergibbons.com/alarms-2/multiple-serious-vulnerabilities-in-rsi-videofieds-alarm-protocol/).

The server runs on TCP port 888.

You must configure the Videofied panel to connect to the server. The panel must be configured with the following settings:
1. Switch to "Access level 4"
2. Select "Configuration"
3. Select "Central Station Configuration"
4. Select "Frontel Security Parameters"
    - Enable
    - Configure "Server Addresses" to the Homebrige server IP

Tested with XT-iP730 on firmware 04.04.37.0F8F
