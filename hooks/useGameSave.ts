'use client';
import {useCallback,useEffect,useState} from 'react';
import {SaveGame} from '@/types/game';
import {loadGame,saveGame} from '@/utils/storage';
export function useGameSave(){const [save,setSaveState]=useState<SaveGame|null>(null);const [ready,setReady]=useState(false);useEffect(()=>{setSaveState(loadGame());setReady(true)},[]);const setSave=useCallback((next:SaveGame|((old:SaveGame)=>SaveGame))=>{setSaveState(old=>{const value=typeof next==='function'?next(old!):next;saveGame(value);return value})},[]);return{save,setSave,ready}}
