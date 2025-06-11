export const banForRefresh = () => {
    const date = new Date();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    if(hour === 0 && minute === 0 && second < 10 ) return true;
    if(hour === 23 && minute === 59 && second > 58 ) return true;
    else return false;
}
