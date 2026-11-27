import React, { useEffect, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { AutoPfpImageSearch, type SearchImage } from './imageSearch'
import { AutoPfpGallery, type GalleryImage, type SavedCollection } from './gallery'

const searcher = new AutoPfpImageSearch()
const gallery = new AutoPfpGallery()
const styles = StyleSheet.create({
  root: { padding: 16, gap: 12 }, title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  sub: { color: '#aaa', fontSize: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: { backgroundColor: '#24262b', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140, flexGrow: 1 },
  button: { backgroundColor: '#5865f2', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' }, card: { backgroundColor: '#202226', borderRadius: 10, padding: 10, gap: 8 },
  image: { width: 112, height: 112, borderRadius: 8, backgroundColor: '#303238' },
  small: { color: '#ddd', fontSize: 13 }, section: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },
})
function Button({ label, onPress, muted = false }: { label: string; onPress: () => void; muted?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.button, muted && { backgroundColor: '#484b52' }]}><Text style={styles.buttonText}>{label}</Text></Pressable>
}
export default function AutoPfpSettings() {
  const [query, setQuery] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [results, setResults] = useState<SearchImage[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [collections, setCollections] = useState<SavedCollection[]>([])
  const [collectionName, setCollectionName] = useState('')
  const [intervalSec, setIntervalSec] = useState('30')
  const [running, setRunning] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [cropMode, setCropMode] = useState<'cover' | 'contain'>('cover')
  const [squareSize, setSquareSize] = useState('512')
  const [quality, setQuality] = useState('92')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Loading saved gallery…')
  useEffect(() => { void reload(); }, [])
  useEffect(() => {
    if (!running || images.length < 2) return
    const ms = Math.max(10, Number(intervalSec) || 30) * 1000
    const timer = setInterval(() => setPreviewIndex(i => (i + 1) % images.length), ms)
    return () => clearInterval(timer)
  }, [running, images.length, intervalSec])
  async function reload() {
    try { setImages(await gallery.getAll()); setCollections(await gallery.getCollections()); setStatus('Gallery loaded from local IndexedDB.') }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Gallery load failed') }
  }
  async function doSearch() {
    setBusy(true); setStatus('Searching Wikimedia Commons…')
    try { const found = await searcher.search(query, 24); setResults(found); setStatus(`${found.length} search results.`) }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Search failed') }
    finally { setBusy(false) }
  }
  async function addUrl(url: string) {
    if (!url.trim()) return
    setBusy(true)
    try { await gallery.addFromUrl(url.trim()); await reload(); setManualUrl(''); setStatus('Saved image to local gallery.') }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Image add failed. URL may block downloads (CORS).') }
    finally { setBusy(false) }
  }
  async function importFiles() {
    setBusy(true)
    try { const added = await gallery.pickFilesFromDevice(); await reload(); setStatus(`${added.length} image(s) imported.`) }
    catch (e) { setStatus(e instanceof Error ? e.message : 'File import unavailable in this runtime') }
    finally { setBusy(false) }
  }
  async function removeImage(id: string) {
    try { await gallery.remove(id); setRunning(false); setPreviewIndex(0); await reload(); setStatus('Image removed.') }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Remove failed') }
  }
  async function saveTheme() {
    if (!collectionName.trim() || images.length === 0) { setStatus('Name the collection and add at least one image.'); return }
    try { await gallery.saveCollection(collectionName, images.map(i => i.id)); setCollectionName(''); setCollections(await gallery.getCollections()); setStatus('Collection saved persistently.') }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Save collection failed') }
  }
  async function loadTheme(c: SavedCollection) {
    try { const all = await gallery.getAll(); const chosen = c.imageIds.map(id => all.find(img => img.id === id)).filter((img): img is GalleryImage => Boolean(img)); setImages(chosen); setPreviewIndex(0); setRunning(false); setStatus(`Loaded ${c.name} (${chosen.length} images).`) }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Load collection failed') }
  }
  async function deleteTheme(id: string) {
    try { await gallery.removeCollection(id); setCollections(await gallery.getCollections()); setStatus('Collection deleted.') }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Delete collection failed') }
  }
  async function processAll() {
    const size = Math.min(2048, Math.max(64, Math.round(Number(squareSize) || 512)))
    const q = Math.min(100, Math.max(10, Number(quality) || 92)) / 100
    setBusy(true)
    try { await Promise.all(images.map(img => gallery.processImage(img, size, q, cropMode))); await reload(); setStatus(`Processed ${images.length} image(s): ${size}px square, JPEG ${Math.round(q * 100)}%, ${cropMode}.`) }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Image processing failed') }
    finally { setBusy(false) }
  }
  return <ScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>AutoPFP Rotator</Text>
    <Text style={styles.sub}>Persistent local gallery and preview tools. This does not modify your Discord avatar.</Text>
    <Text style={styles.section}>Search images</Text>
    <View style={styles.row}><TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="Theme or subject" placeholderTextColor="#999"/><Button label={busy ? 'Working…' : 'Search'} onPress={doSearch}/></View>
    <Text style={styles.sub}>{status}</Text>
    <View style={styles.row}>{results.map((r,i)=><View style={styles.card} key={`${r.originalUrl}-${i}`}><Image source={{uri:r.url}} style={styles.image} resizeMode="cover"/><Text style={styles.small} numberOfLines={2}>{r.title}</Text><Button label="Add" onPress={()=>void addUrl(r.originalUrl)}/></View>)}</View>
    <Text style={styles.section}>Import / add by URL</Text>
    <View style={styles.row}><Button label="Import from device" onPress={()=>void importFiles()}/><TextInput style={styles.input} value={manualUrl} onChangeText={setManualUrl} placeholder="HTTPS image URL" placeholderTextColor="#999" autoCapitalize="none"/><Button label="Add URL" onPress={()=>void addUrl(manualUrl)}/></View>
    <Text style={styles.section}>Persistent gallery ({images.length})</Text>
    {images.length===0 ? <Text style={styles.sub}>Gallery is empty. Import or add an image above.</Text> : <View style={styles.row}>{images.map((img,i)=><View style={styles.card} key={img.id}><Image source={{uri:img.dataUrl}} style={styles.image} resizeMode={cropMode}/><Text style={styles.small} numberOfLines={2}>{img.name}</Text><Button label="Remove" muted onPress={()=>void removeImage(img.id)}/></View>)}</View>}
    <Text style={styles.section}>Preview rotation</Text>
    <View style={styles.row}><TextInput style={[styles.input,{minWidth:90,flexGrow:0}]} value={intervalSec} onChangeText={setIntervalSec} keyboardType="numeric"/><Text style={styles.small}>seconds (min 10)</Text><Button label="Start" onPress={()=>{if(images.length<2){setStatus('Add at least 2 images to preview.');return}setRunning(true);setStatus('Preview running.')}}/><Button label="Stop" muted onPress={()=>{setRunning(false);setStatus('Preview stopped.')}}/></View>
    {images.length>0&&<View style={styles.card}><Image source={{uri:images[Math.min(previewIndex,images.length-1)].dataUrl}} style={{width:240,height:240,alignSelf:'center',borderRadius:12}} resizeMode={cropMode}/><Text style={styles.small}>Preview {Math.min(previewIndex+1,images.length)} / {images.length} · {running?'Playing':'Paused'}</Text><View style={styles.row}><Button label="Previous" muted onPress={()=>setPreviewIndex(i=>(i-1+images.length)%images.length)}/><Button label="Next" muted onPress={()=>setPreviewIndex(i=>(i+1)%images.length)}/></View></View>}
    <Text style={styles.section}>Saved collections</Text>
    <View style={styles.row}><TextInput style={styles.input} value={collectionName} onChangeText={setCollectionName} placeholder="Collection name" placeholderTextColor="#999"/><Button label="Save current" onPress={()=>void saveTheme()}/></View>
    {collections.map(c=><View style={styles.row} key={c.id}><Text style={styles.small}>{c.name} · {c.imageIds.length} saved</Text><Button label="Load" onPress={()=>void loadTheme(c)}/><Button label="Delete" muted onPress={()=>void deleteTheme(c.id)}/></View>)}
    <Text style={styles.section}>Real image processing</Text>
    <View style={styles.row}><Button label={cropMode==='cover'?'Crop: Fill':'Crop: Fit'} muted onPress={()=>setCropMode(m=>m==='cover'?'contain':'cover')}/><Text style={styles.small}>mode: {cropMode}</Text></View>
    <View style={styles.row}><TextInput style={[styles.input,{minWidth:80,flexGrow:0}]} value={squareSize} onChangeText={setSquareSize} keyboardType="numeric"/><Text style={styles.small}>px</Text><TextInput style={[styles.input,{minWidth:80,flexGrow:0}]} value={quality} onChangeText={setQuality} keyboardType="numeric"/><Text style={styles.small}>JPEG quality %</Text><Button label={busy?'Processing…':'Process gallery'} onPress={()=>void processAll()}/></View>
    <Text style={styles.sub}>Processing saves resized square JPEGs over the selected gallery images. Device import uses a web-style file input; runtime support on Valenced Android still needs testing.</Text>
  </ScrollView>
}
