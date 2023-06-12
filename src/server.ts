import { createCipheriv, randomBytes } from "crypto";
import { Logger } from "homebridge";
import { Socket, createServer } from "net";
import { Event, commands, generatePresharedKey, parseEvent } from "./videofied";

export class AlarmServer {
  private readonly log: Logger;
  private readonly handleEvent: (event: Event) => void;
  private socket: Socket | undefined;
  private preSharedKey: string | undefined;
  private heartbeatInterval: NodeJS.Timer | undefined;

  constructor(log: Logger, handleEvent: (event: Event) => void) {
    this.log = log;
    this.handleEvent = handleEvent;
    this.startServer();
  }

  private startServer = () => {
    const server = createServer((socket) => {
      this.log.info(`panel connection from ${socket.remoteAddress}`);

      this.socket = socket;
      this.heartbeatInterval = setInterval(
        this.heartbeat,
        // every minute
        60 * 1000
      );

      // send initial IDENT
      this.sendMessage(commands.identify);

      socket.on("data", (data) => {
        const message = deleteX1A(data.toString());
        this.log.debug("received:", message);

        // parse response type
        const [eventType, ...eventData] = message.includes(",")
          ? message.split(",")
          : [message];

        switch (eventType) {
          case "IDENT": {
            const serial = eventData[0];

            if (!serial) {
              throw new Error("serial is not set");
            }

            this.preSharedKey = generatePresharedKey(serial);

            this.log.debug("serial", serial);
            this.log.debug("pre-shared key from serial", this.preSharedKey);

            // set pre-shared key on panel
            this.sendMessage(commands.setKey(this.preSharedKey));

            // send version
            this.sendMessage(commands.version);

            // generate server challenge
            const serverChallenge = generateRandomChallenge();
            this.sendMessage(commands.auth1(serverChallenge));

            break;
          }

          case "AUTH2": {
            if (!this.preSharedKey) {
              throw new Error("preSharedKey is not set");
            }

            const challenge = eventData[1];

            if (!challenge) {
              throw new Error("challenge is not set");
            }

            const response = getChallengeResponse(this.preSharedKey, challenge);

            // respond to panel challenge
            this.sendMessage(commands.auth3(response));
            break;
          }

          case "AUTH_SUCCESS": {
            const [
              accountNumber,
              _unknown1,
              datetime,
              _unknown2,
              _unknown3,
              panelSerial,
            ] = eventData;

            this.log.info(
              `panel authenticated successfully. serial: ${panelSerial}, account number: ${accountNumber}, panel datetime: ${datetime}`
            );

            break;
          }

          case "ALARM": {
            this.sendMessage(commands.alarmAck);
            break;
          }

          case "LOG": {
            this.sendMessage(commands.logAck);
            break;
          }

          case "FILE": {
            this.sendMessage(commands.fileAck);
            break;
          }

          case "REQACK": {
            this.sendMessage(commands.ack);
            break;
          }

          case "EVENT": {
            const event = parseEvent(eventData);

            this.log.debug(`parsed event: ${JSON.stringify(event)}`);

            this.handleEvent(event);
            break;
          }

          case "ARMING": {
            // no op
            break;
          }

          default: {
            this.log.debug("unknown event type");
          }
        }
      });

      socket.on("end", () => {
        this.log.info("panel disconnected");

        this.socket = undefined;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      });

      socket.on("error", (err) => {
        this.log.error("socket error", err);
      });
    });

    server.listen(888, () => {
      this.log.info(`server started on ${JSON.stringify(server.address())}`);
    });
  };

  private sendMessage = (message: string): boolean => {
    if (!this.socket) {
      this.log.debug("panel is not connected, ignoring command");
      return false;
    }

    this.log.debug("sending:", message);
    this.socket.write(`${message}\x1a`);
    return true;
  };

  // the panel will disconnect from the server if there's no activity for 5 minutes
  // sending a STATUS command seems to be enough to keep the panel connected
  // sending a ACK command seems to still timeout after an hour
  private heartbeat = () => {
    this.log.debug("sending heartbeat to keep panel connected to server");
    this.sendMessage(commands.status);
  };

  public arm = (): boolean => {
    return this.sendMessage(commands.arm);
  };

  public disarm = (): boolean => {
    return this.sendMessage(commands.disarm);
  };
}

const decodeHex = (string: string) => Buffer.from(string, "hex");

const generateRandomChallenge = () => {
  return randomBytes(16).toString("hex").toUpperCase();
};

const getChallengeResponse = (key: string, challenge: string) => {
  const cipher = createCipheriv("aes-128-ecb", decodeHex(key), null);

  return cipher.update(decodeHex(challenge)).toString("hex").toUpperCase();
};

const deleteX1A = (string: string) => {
  if (string.endsWith("\x1a")) {
    return string.slice(0, -1);
  }
  return string;
};
