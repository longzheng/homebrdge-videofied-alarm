export const commands = {
  identify: "IDENT,1000",
  setKey: (preSharedKey: string) => `SETKEY,${preSharedKey}`,
  version: "VERSION,2,0",
  auth1: (challenge: string) => `AUTH1,${challenge}`,
  auth3: (response: string) => `AUTH3,${response}`,
  alarmAck: "ALARM_ACK",
  logAck: "LOG_ACK",
  fileAck: "FILE_ACK",
  ack: "ACK",
  arm: "ARMING,1",
  disarm: "ARMING,0",
  status: "STATUS",
} as const;

export type Event =
  | {
      type: "intrusion" | "tamper";
      peripheral: string;
      detector: string;
    }
  | {
      type: "panic" | "panicSmoke" | "panicMedical";
      peripheral: string;
    }
  | {
      type: "armed" | "disarmed";
      armingProfile: string;
      codeOrBadge: string;
    }
  | {
      type: "alarmTest";
    }
  | {
      type: "unknown";
    };

// events list https://resideo.kayako.com/article/561-events-list-frontel
export const parseEvent = (eventData: string[]): Event => {
  switch (eventData[0]) {
    case "1":
      return {
        type: "intrusion",
        peripheral: eventData[1]!,
        detector: eventData[2]!,
      };
    case "3":
      return {
        type: "tamper",
        peripheral: eventData[1]!,
        detector: eventData[2]!,
      };
    case "5":
      return {
        type: "panic",
        peripheral: eventData[1]!,
      };
    case "24":
      return {
        type: "armed",
        armingProfile: eventData[1]!,
        codeOrBadge: eventData[2]!,
      };
    case "25":
      return {
        type: "disarmed",
        armingProfile: eventData[1]!,
        codeOrBadge: eventData[2]!,
      };
    case "29":
      return {
        type: "alarmTest",
      };
    case "32":
      return {
        type: "panicSmoke",
        peripheral: eventData[1]!,
      };
    case "34":
      return {
        type: "panicMedical",
        peripheral: eventData[1]!,
      };
    default: {
      return {
        type: "unknown",
      };
    }
  }
};

// key extracted from videofied panel serial number
// https://cybergibbons.com/alarms-2/multiple-serious-vulnerabilities-in-rsi-videofieds-alarm-protocol/
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
