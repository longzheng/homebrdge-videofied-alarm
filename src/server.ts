import { createCipheriv, randomBytes } from "crypto";
import { Logger } from "homebridge";
import { Socket, createServer } from "net";

export class AlarmServer {
  private readonly log: Logger;
  private socket: Socket | undefined;
  private preSharedKey: string | undefined;

  public handleEvent: (eventData: string[]) => void;

  constructor(log: Logger, handleEvent: (eventData: string[]) => void) {
    this.log = log;
    this.handleEvent = handleEvent;
    this.startServer();
  }

  private startServer = () => {
    const server = createServer((socket) => {
      this.log.debug(`panel connection from ${socket.remoteAddress}`);

      this.socket = socket;

      // send initial IDENT
      this.sendMessage("IDENT,1000");

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
            this.sendMessage(`SETKEY,${this.preSharedKey}`);

            // send version
            this.sendMessage("VERSION,2,0");

            // generate server challenge
            const serverChallenge = generateRandomChallenge();
            this.sendMessage(`AUTH1,${serverChallenge}`);

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
            this.sendMessage(`AUTH3,${response}`);
            break;
          }

          case "AUTH_SUCCESS": {
            this.log.debug("authenticated successfully");

            const [
              accountNumber,
              _unknown1,
              datetime,
              _unknown2,
              _unknown3,
              panelSerial,
            ] = eventData;

            break;
          }

          case "ALARM": {
            this.sendMessage("ALARM_ACK");
            break;
          }

          case "LOG": {
            this.sendMessage("LOG_ACK");
            break;
          }

          case "FILE": {
            this.sendMessage("FILE_ACK");
            break;
          }

          case "REQACK": {
            this.sendMessage("ACK");
            break;
          }

          case "EVENT": {
            this.handleEvent(eventData);
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
        this.log.debug("panel disconnected");
        this.socket = undefined;
      });

      socket.on("error", (err) => {
        this.log.debug("socket error", err);
      });
    });

    server.listen(888, () => {
      this.log.debug(`server started on ${JSON.stringify(server.address())}`);
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
  }

  public arm = (): boolean => {
    return this.sendMessage("ARMING,1");
  };

  public disarm = (): boolean => {
    return this.sendMessage("ARMING,0");
  };
}

export const decodeHex = (string: string) => Buffer.from(string, "hex");

export const generatePresharedKey = (serial: string) =>
  serial[4] +
  "0" +
  serial[15] +
  serial[11] +
  "0" +
  serial[5] +
  serial[13] +
  serial[6] +
  serial[8] +
  serial[12] +
  serial[7] +
  serial[14] +
  "1" +
  "0" +
  serial[10] +
  serial[9] +
  serial[7] +
  serial[10] +
  serial[4] +
  serial[15] +
  serial[13] +
  serial[6] +
  serial[12] +
  "0" +
  serial[8] +
  "0" +
  serial[14] +
  "1" +
  serial[11] +
  serial[11] +
  "0" +
  serial[5];

export const generateRandomChallenge = () => {
  return randomBytes(16).toString("hex").toUpperCase();
};

export const getChallengeResponse = (key: string, challenge: string) => {
  const cipher = createCipheriv("aes-128-ecb", decodeHex(key), null);

  return cipher.update(decodeHex(challenge)).toString("hex").toUpperCase();
};

export const deleteX1A = (string: string) => {
  if (string.endsWith("\x1a")) {
    return string.slice(0, -1);
  }
  return string;
};