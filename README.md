# homebridge-videofied-alarm
Homebridge plugin for controlling Videofied alarm systems

![IMG_0058](https://github.com/longzheng/homebridge-videofied-alarm/assets/484912/f4820cb6-64f6-4299-9c28-6c14bf153aa5)

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

By default the panel will only connect to the server upon an event (e.g. armed/disarmed) and disconnect from the server after 5 minutes. After the panel is disconnected, it is no longer possible to send commands to the panel. To workaround this, the simulated server will try to send a dummy ACK command to the panel every 1 minute which appears to prevent it from disconnecting. However if at any point the server restarts, then the connection will be killed and cannot be recovered.

Tested with XT-iP730 on firmware 04.04.37.0F8F
