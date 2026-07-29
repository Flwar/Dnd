import {SaveGame} from '@/types/game';
export const SAVE_KEY='shattered-crown-save-v1';
export const loadGame=():SaveGame|null=>{try{const value=localStorage.getItem(SAVE_KEY);return value?JSON.parse(value):null}catch{return null}};
export const saveGame=(save:SaveGame)=>localStorage.setItem(SAVE_KEY,JSON.stringify(save));
export const clearGame=()=>localStorage.removeItem(SAVE_KEY);
