export enum GestureDirection {
  Normal = "normal",
  Inverted = "inverted",
}

export interface FaceControl {
  key: string;
  icon: string;
  label: string;
  instructions: string;
  values: {
    key: keyof FaceValues;
    label: string;
    min: number;
    max: number;
    gesture: "x" | "y" | "rotation" | "scale";
    direction?: GestureDirection;
  }[];
}

export const FACE_CONTROLS: FaceControl[] = [
  {
    key: "face",
    icon: "face.smiling",
    label: "FACE",
    instructions: "Tap, slide or rotate to adjust the face position",
    values: [
      {
        key: "rotateYaw",
        label: "HORIZONTAL",
        min: -20,
        max: 20,
        gesture: "x",
      },
      {
        key: "rotatePitch",
        label: "VERTICAL",
        min: -20,
        max: 20,
        gesture: "y",
        direction: GestureDirection.Inverted,
      },
      {
        key: "rotateRoll",
        label: "TILT",
        min: -20,
        max: 20,
        gesture: "rotation",
      },
    ],
  },
  {
    key: "mouth",
    icon: "mouth",
    label: "MOUTH",
    instructions: "Pinch to adjust the mouth",
    values: [
      { key: "smile", label: "SMILE", min: -0.3, max: 1.3, gesture: "scale" },
    ],
  },
  {
    key: "eyes",
    icon: "eye",
    label: "EYES",
    instructions: "Tap, slide or pinch to adjust the eye position",
    values: [
      {
        key: "blink",
        label: "EYELID APERTURE",
        min: -20,
        max: 5,
        gesture: "scale",
      },
      {
        key: "pupilX",
        label: "HORIZONTAL",
        min: -15,
        max: 15,
        gesture: "x",
        // direction: GestureDirection.Inverted,
      },
      {
        key: "pupilY",
        label: "VERTICAL",
        min: -15,
        max: 15,
        gesture: "y",
        //direction: GestureDirection.Inverted,
      },
    ],
  },
  {
    key: "eyebrows",
    icon: "eyebrow",
    label: "EYEBROWS",
    instructions: "Tap or slide to adjust the eyebrow position",
    values: [
      {
        key: "eyebrow",
        label: "HEIGHT",
        min: -10,
        max: 15,
        gesture: "y",
        // direction: GestureDirection.Inverted,
      },
    ],
  },
];

export type FaceValues = {
  rotatePitch?: number;
  rotateYaw?: number;
  eyebrow?: number;
  rotateRoll?: number;
  pupilX?: number;
  pupilY?: number;
  smile?: number;
  blink?: number;
  wink?: number;
};

export const DEFAULT_FACE_VALUES: FaceValues = {
  rotatePitch: 0,
  rotateYaw: 0,
  eyebrow: 0,
  rotateRoll: 0,
  pupilX: 0,
  pupilY: 0,
  smile: 0,
  blink: 0,
  wink: 0,
};
