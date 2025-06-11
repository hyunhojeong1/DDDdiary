import NetInfo from '@react-native-community/netinfo';

export const checkInternetConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  if(state.isConnected && state.isInternetReachable !== false){
    return true;
  } else {
    return false;
  }
};
