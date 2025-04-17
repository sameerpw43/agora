import AccessToken from "agora-access-token";
const RtcTokenBuilder = AccessToken.RtcTokenBuilder;
const RtcRole = AccessToken.RtcRole;

// Agora app credentials
const APP_ID = "29ad3ee75cba4025a5460d07a93e023e";
const APP_CERTIFICATE = "b953328fd69b4e0abde221e0b7a4a58d";
const DEFAULT_TOKEN = "007eJxTYOhS9bD5eH3Jmg2iDv90b67aGWC/zZfl3IWdSwQ0CidEnkpTYDBPMTc2STWyNE42SzWxMLA0TEkySTNIMko1MrMwtzRKOST2Pb0hkJFh7YQVrIwMrAyMQAjiqzAkmRhZJJsnGegamliY6RoaphnoJhkkW+iamCeamhuYGCabJVkAAKv5J4o=";

export const generateRtcToken = (channelName: string, uid: number, role = RtcRole.PUBLISHER) => {
  if (!APP_CERTIFICATE) {
    console.warn("Agora App Certificate not provided, using default token");
    return DEFAULT_TOKEN;
  }
  
  // Set token expiration time
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  
  // Build the token
  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
};

export const getAgoraConfig = () => {
  return {
    appId: APP_ID,
    channel: "medical-channel"
  };
};