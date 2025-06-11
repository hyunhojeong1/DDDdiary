import { Asset } from "expo-asset";
import React, { useEffect, useState } from "react";
import * as FileSystem from 'expo-file-system';
import { FlatList, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/utils/useAppTheme";
import { ThemedStyle } from "@/theme";
import { Screen, Text } from "@/components";


interface RawLicenseEntry {
    licenses: string
    repository?: string
    publisher?: string
    email?: string
}
type RawLicenseData = Record<string, RawLicenseEntry>

interface LibraryInfo {
    name: string
    license: string
    repository?: string
    publisher?: string
    email?: string
}
  
export default function LicenseFullScreen(){
    const { themed } = useAppTheme();
    const [licenseArray, setLicenseArray] = useState<LibraryInfo[]>([]);
    const [licenseFull, setLicenseFull] = useState<string>('');
    const [licenseFull2, setLicenseFull2] = useState<string>('');

    useEffect(()=>{
        handleFullLicense();
    },[])

    
    const handleFullLicense = async () => {
            const [assetThirdPartyLicense] = await Asset.loadAsync(require('../../assets/licenses/LICENSE_FULL_3.txt'));
            if(assetThirdPartyLicense.localUri){
                const textContent = await FileSystem.readAsStringAsync(assetThirdPartyLicense.localUri);
                const data : RawLicenseData = JSON.parse(textContent);
                const contentArray : LibraryInfo[] = Object.entries(data).map(([pkg, info])=>({
                name : pkg,
                license : info.licenses,
                publisher : info.publisher,
                email : info.email,
                repository : info.repository,
                }));
                
                setLicenseArray(contentArray);
            }
            const [assetFull] = await Asset.loadAsync(require('../../assets/licenses/LICENSE_FULL_1.txt'));
            if(assetFull.localUri){
                const fullContent = await FileSystem.readAsStringAsync(assetFull.localUri);
                setLicenseFull(fullContent);
            }
            const [assetFull2] = await Asset.loadAsync(require('../../assets/licenses/LICENSE_FULL_2.txt'));
            if(assetFull2.localUri){
                const fullContent2 = await FileSystem.readAsStringAsync(assetFull2.localUri);
                setLicenseFull2(fullContent2);
            }
    };
    
    return(
        <Screen
            contentContainerStyle={themed($container)}  
        >
            <FlatList
                data={licenseArray}
                keyExtractor={item => item.name}
                initialNumToRender={2}
                windowSize={1}
                ListHeaderComponent={()=>(
                    <Text>{licenseFull}</Text>
                )}
                ListHeaderComponentStyle={{padding:10}}
                ListFooterComponent={()=>(
                    <Text>{licenseFull2}</Text>
                )}
                ListFooterComponentStyle={{padding:10}}
                renderItem={({item})=> (
                    <View style={{padding: 10}}>
                        <Text>name: {item.name}</Text>
                        <Text>licenses: {item.license}</Text>
                        {item.publisher && <Text>publisher: {item.publisher}</Text>}
                        {item.email && <Text>email: {item.email}</Text>}
                        {item.repository && <Text>repository: {item.repository}</Text>}
                    </View>
                )}
            />
        </Screen>
    )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
    backgroundColor: colors.tabBackground,
  })
  