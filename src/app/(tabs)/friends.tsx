import { Button, Card, EmptyState, Header, ListView, Screen, Text, TextField } from "@/components";
import { useStores } from "@/models";
import { spacing, ThemedStyle } from "@/theme";
import { useAppTheme } from "@/utils/useAppTheme";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Platform, ScrollView, TextInput, TextStyle, View, ViewStyle } from "react-native";
import { BannerAd, BannerAdSize, TestIds, useForeground } from "react-native-google-mobile-ads";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { checkInternetConnection } from "@/utils/network";
import SelfAssessmentModal from "../selfCheckModal";
import Feather from '@expo/vector-icons/Feather';
import { Menu, Divider } from 'react-native-paper';


const adUnitId_Test = TestIds.BANNER;
const adUnitId_Real = Platform.OS === "ios" ? "ca-app-pub-5890559342478686/4162087736" : "ca-app-pub-5890559342478686/8549422280";


export default observer(function Friends() {
  const { theme, themed } = useAppTheme();
  const { myFriendStore, myStatusStore } = useStores();
  const { t } = useTranslation();
  const friendArray = Array.from(myFriendStore.MyFriends.values());
  
  const [page, setPage] = useState(true);
  const [warning, setWarning] = useState("");
  const [nickname, setNickname] = useState("");
  const randomIdRef = useRef<TextInput>(null);
  const [randomId, setRandomId] = useState("");
  const myMemoRef = useRef<TextInput>(null);
  const [mymemo, setMymemo] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [isDeleted, setIsDeleted] = useState(true);

  const [moreBtnKey, setmoreBtnKey] = useState("");
  const openMenu = (friend : string) => setmoreBtnKey(friend);
  const closeMenu = () => setmoreBtnKey("");


  const bannerRef = useRef<BannerAd>(null);
  const admobOn = myStatusStore.admobOn;
  const adUnitId = admobOn && !(__DEV__) ? adUnitId_Real : adUnitId_Test;
  

  useEffect(()=>{
    if (myFriendStore.MyFriends.size > 0) {
      handleRefresh(); //저장-정렬 시 observe가 작동
    }
    myFriendStore.setProp('refetchFriends', true);
  },[]);

  useEffect(()=>{
    if(nickname) {setNickname(prev => `${prev} `);}
    if(randomId) {setRandomId(prev => `${prev} `);}
    if(mymemo) {setMymemo(prev => `${prev} `);}
  },[theme.isDark])

  useForeground(() => {
    Platform.OS === 'ios' && bannerRef.current?.load();
  });

  const handleRefresh = async ()=> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    if(!myFriendStore.refetchFriends) {
      Alert.alert(t('friendScreen:explainLimit'),t('friendScreen:explainLimit2'));
      return;
    }
    myFriendStore.setProp("isReady", false);
    myFriendStore.refreshMyFriends();
  };

  const handleToggleFavorite = (nickrandomId : string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    myFriendStore.toggleFavorite(nickrandomId);
    closeMenu();
  };

  const handleDeleteFriend = async (nickrandomId : string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    Alert.alert(
      t('friendScreen:explainDelete'), t('friendScreen:explainDelete2'),
      [{ text: t('common:cancel'), style: 'destructive' },
        { text: t('common:ok'), onPress: async () => {
          setIsDeleted(false);
          try {
            await myFriendStore.deleteFriend(nickrandomId);
            setIsDeleted(true);
            closeMenu();
          } catch (e) {
            Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
            setIsDeleted(true);
            closeMenu();
          }
      }}]
    );
  };

  const handleAddAFriend = async()=> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasInternet = await checkInternetConnection();
    if(!hasInternet){
      Alert.alert(t('appStartScreen:warnNoInternet1'), t('appStartScreen:warnNoInternet2'));
      return;
    }
    setIsSaved(false);
    const nickTrim = nickname.trimEnd();
    const randomTrim = randomId.trimEnd();
    const mymemoTrim = mymemo.trimEnd();
    try {
      const response = await myFriendStore.addFriendOrErrorInfo(nickTrim, randomTrim, mymemoTrim);
      if(response) {
        if(response === "ok") {
          setNickname("");
          setRandomId("");
          setMymemo("");
          setPage(true);
          setIsSaved(true);
          return;
        } else {
          setWarning(response);
        }
      } else {
        Alert.alert(t('friendScreen:explainAddError'),t('friendScreen:explainAddError2'));
      }
      setIsSaved(true);
    } catch (e) {
      Alert.alert(t('settingScreen:invalidFFRequest1'), t('settingScreen:invalidFFRequest2'));
      setIsSaved(true);
    }
  };


  return (
    <Screen 
      contentContainerStyle={themed($container)}
    >
      <Header 
        titleTx="tabs:friends"
        containerStyle={themed($header)}
        RightActionComponent={ page ?
          <Button 
            preset='default'
            tx='friendScreen:addNew' 
            style = {themed($headerBtn)} 
            onPress={()=>{setPage(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
          /> : <Text text="" />
        }
        LeftActionComponent={ page ? 
          <Button 
            preset="default"
            tx="friendScreen:refreshBtn"
            style = {themed($headerBtn)} 
            onPress={handleRefresh}
          />
        : <Button 
          preset="default"
          tx="common:cancel"
          style = {themed($headerBtn)} 
          onPress={()=>{setPage(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}
          />
        }
      />
      { page ? 
        <Screen contentContainerStyle={themed($container)}>
          <View style={themed($adContainer)}>
            <BannerAd
              ref={bannerRef} 
              unitId={adUnitId} 
              size={BannerAdSize.LARGE_BANNER}
            />
          </View>
          { !myFriendStore.isReady ?
            <View style={themed($actIndicatorContainer)}>
              <ActivityIndicator size={"large"} />
            </View> 
          : null}
          <ListView
            data = {friendArray}
            keyExtractor={(item)=>item.friendNickRandom}
            estimatedItemSize={56}
            ListHeaderComponent={()=>(
              <Text
                text={t('friendScreen:explainFriends')}
                style={themed($noticeContainer)}
              />
            )}
            ListFooterComponent={()=>(
              friendArray.length === 0 ? 
                <EmptyState 
                  style={themed($emptyStatePage)}
                  headingStyle={themed($emptyStateHeadText)}
                  headingTx="emptyStateComponent:friends.heading"
                  contentTx="emptyStateComponent:friends.content"
                /> 
              : null
            )}
            renderItem={({item})=>(
              <Card
                key={item.friendNickRandom}
                style={themed($listItemCard)}
                headingStyle={themed($friendNickText)}
                contentStyle={themed($friendMemoText)}
                heading={`${item.friendNickname}(${item.friendRandomId})\n${item.myMemo}`}
                content={item.friendTodayProcess ? t('friendScreen:processYes') : t('friendScreen:processNo')}
                ContentComponent={
                  item.friendTodayProcess ?
                    <View style={{flexDirection:"row", alignItems:'center'}}>
                      <FontAwesome name="circle" size={spacing.sm} color="#00aa00" />
                      <Text tx="friendScreen:processYes" />
                    </View>
                  :
                    <View style={{flexDirection:"row", alignItems:'center'}}>
                      <FontAwesome name="circle" size={spacing.sm} color="#999999" />
                      <Text tx="friendScreen:processNo" />
                    </View>
                }
                footer={
                  item.friendAlarms === "" ? 
                    `${t('friendScreen:noAlarms')}\n${t('friendScreen:todayQAnswer')}${item.friendTodayQAnswer}`
                  : `${t('friendScreen:yesAlarms')}${item.friendAlarms}\n${t('friendScreen:todayQAnswer')}${item.friendTodayQAnswer}`
                }
                footerStyle={themed($cardFooterContainer)}
                RightComponent={
                    <View>
                      <Menu
                        contentStyle={{backgroundColor : '#fff'}}
                        visible={item.friendNickRandom === moreBtnKey}
                        onDismiss={closeMenu}
                        anchor={<Button style={themed($moreButton)} onPress={()=>openMenu(item.friendNickRandom)}><Feather name="more-vertical" size={spacing.md} color="gray" /></Button>}>
                        <Menu.Item
                          containerStyle={{alignItems : 'center'}}
                          onPress={() => handleToggleFavorite(item.friendNickRandom)} 
                          title={
                            item.friendFavorite ?
                            t('friendScreen:favoriteYesBtn') : t('friendScreen:favoriteNoBtn')
                          }
                          leadingIcon={()=>(
                            item.friendFavorite ?
                            <FontAwesome name="star" size={spacing.lg} color="gold" /> : <FontAwesome name="star" size={spacing.lg} color="#999999" />
                          )}
                        />
                        <Menu.Item
                          containerStyle={{alignItems : 'center'}}
                          onPress={() => handleDeleteFriend(item.friendNickRandom)}
                          title={t('friendScreen:BanBtn')}
                          leadingIcon={()=>(
                            isDeleted ? 
                              <FontAwesome name="ban" size={spacing.lg} color="#999999" />
                              : <View><ActivityIndicator size={"small"} /></View>
                          )}
                        />
                      </Menu>
                    </View>
                }
              />
            )}
          />
        </Screen>
      : 
        <Screen contentContainerStyle={themed($container)}>
          <ScrollView style={themed($scrollContainer)}>
            <TextField
              readOnly
              inputWrapperStyle={themed($inactiveTextField)}
              multiline={true}
              value={theme.isDark ? 
                `${t('friendScreen:explainFriendLimit')}${myFriendStore.getFriendLength()}${t('friendScreen:explainModify')}`
              : `${t('friendScreen:explainFriendLimit')}${myFriendStore.getFriendLength()}${t('friendScreen:explainModify')} `}
            />
            <Text
              style={themed($subheadingText)}
              tx="friendScreen:myRandomId"
              preset="subheading"
            />
            <TextField
              readOnly
              multiline={true}
              inputWrapperStyle={{minHeight : 0}}
              value={theme.isDark ? 
                `${myStatusStore.randomId}${t('friendScreen:explainShareId')}`
              : `${myStatusStore.randomId}${t('friendScreen:explainShareId')} `}
            />
            <Text
              style={themed($subheadingText)}
              tx="friendScreen:needNickname"
              preset="subheading"
            />
            <TextField
              inputWrapperStyle={themed($activeTextField)}
              maxFontSizeMultiplier={1.4}
              multiline={false}
              maxLength={30}
              placeholderTx="friendScreen:askNickname"
              value={nickname}
              onChangeText={(value)=>{setNickname(value); setWarning("");}}
              returnKeyType="next"
              returnKeyLabel="next"
              onSubmitEditing={()=>randomIdRef.current?.focus()}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Text
              style={themed($subheadingText)}
              tx="friendScreen:needRandomId"
              preset="subheading"
            />
            <TextField
              inputWrapperStyle={themed($activeTextField)}
              maxFontSizeMultiplier={1.4}
              multiline={false}
              ref={randomIdRef}
              maxLength={7}
              placeholderTx="friendScreen:askRandomId"
              value={randomId}
              onChangeText={(value)=>{setRandomId(value); setWarning("");}}
              returnKeyType="next"
              returnKeyLabel="next"
              onSubmitEditing={()=>myMemoRef.current?.focus()}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Text
              style={themed($subheadingText)}
              tx="friendScreen:needMymemo"
              preset="subheading"
            />
            <TextField
              inputWrapperStyle={themed($activeTextField)}
              maxFontSizeMultiplier={1.4}
              multiline={false}
              ref={myMemoRef}
              maxLength={40}
              placeholderTx="friendScreen:askMymemo"
              value={mymemo}
              onChangeText={setMymemo}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Text
              style={themed($warningText)}
              text={t(warning)}
              preset="formLabel"
            />
            <Button 
              text={isSaved ? t("friendScreen:letsAdd") : "" }
              LeftAccessory={()=> !isSaved ? <View><ActivityIndicator size={"small"} /></View> : null}
              onPress={handleAddAFriend} 
              style={themed($addFriendBtn)}
            />
          </ScrollView>
        </Screen>
      }
      <SelfAssessmentModal
        visible={myStatusStore.needSelfCheck && myStatusStore.todayProcess}
      />
    </Screen>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.tabBackground,
})

const $header: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  borderBottomColor : colors.separator,
  borderBottomWidth : 1,
})

const $headerBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  borderWidth : 0,
})

const $adContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  alignItems : 'center',
  borderBottomColor : colors.border,
  borderBottomWidth : 1,
})

const $actIndicatorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
})

const $noticeContainer: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tabBackground,
  borderRadius : 0,
  borderWidth : 0,
  padding : spacing.xs,
})

const $emptyStatePage: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tabBackground,
  paddingBottom : spacing.xxxl,
})

const $emptyStateHeadText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop : spacing.xl,
})

const $friendNickText: ThemedStyle<TextStyle> = ({ spacing, }) => ({
  fontFamily : "System",
  fontSize : spacing.md,
  fontWeight : '500',
})

const $friendMemoText: ThemedStyle<TextStyle> = ({ spacing, }) => ({
  fontFamily : "System",
  fontSize : spacing.md,
})

const $listItemCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tabBackground,
  borderRadius : 0,
  borderWidth : 0,
  borderBottomWidth : 0.5,
  borderTopWidth : 0.5,
  borderColor : colors.separator,
  paddingLeft : spacing.sm,
})

const $cardFooterContainer: ThemedStyle<TextStyle> = ({}) => ({
  width : '107%',
})

const $moreButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tabBackground,
  paddingLeft : 0,
  paddingBottom : 0,
  paddingTop: 0,
  paddingRight: 0,
  borderRadius : 0,
  borderWidth : 0,
})

const $subheadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tabBackground,
  paddingTop : spacing.sm,
})

const $scrollContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  backgroundColor : colors.tabBackground,
})

const $inactiveTextField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom : spacing.md,
  marginTop : spacing.sm,
  minHeight : 0,
})

const $activeTextField: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor : colors.tabBackground,
})

const $warningText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.palette.angry500,
  paddingVertical : spacing.md,
})

const $addFriendBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginHorizontal : spacing.lg,
  marginBottom : spacing.xxxl,
  backgroundColor : colors.palette.neutral100,
  borderRadius : spacing.lg,
  borderWidth : 1,
})

