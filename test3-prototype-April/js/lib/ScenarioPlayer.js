import TextAudio from "./TextAudio.json.js";
export default class ScenarioPlayer {

    /**
     * 1パートのテキストのデータを格納する
     * @param {*} TextList テキストのオブジェクト
     * @param {*} state ゲームのステータスのオブジェクト
     */
    constructor(TextList,state){

        this.TextList = TextList //シナリオのテキストとそのデータ
        this.state = state //mainから参照するゲームのデータ
        this.msgindex = 0 //現在のテキストの番号
        
        this.startFlag = true //スタート時のチェック
        this.dialogueFlag = true //ダイアログが表示か非表示化
        this.autoPlaying = false //auto機能がオンになっているか
        this.autoPlayingCheck = false //autoが手動で実行されたか
        this.onePictureSwitch = false //一枚絵使用
        this.movingFlag = false //テキストアニメーションが動いてるか
        this.screenDarking = false //暗転中か
        
        this.colorFlag = false //文字設定処理：色
        this.sizeFlag = false //文字設定処理：大文字
        
        this.nowEveId  =  state.textEventId //ScenarioPlayerの世代、これは違えばイベント削除

        this.audios = TextAudio[state.nowPart] //読み込んだaudioのデータ全体
        this.audioNum = 0 //audioの番号
        this.audioStart = 0 //次の音声の再生開始させる番号
        this.audioEnd = 0 //次の音声の再生終了させる番号
        this.audioList = []//new Audio()プリロード
        this.audioObj = null //new Audio()格納
        this.toMapFlag = false //toMapをさせるときの判定
        this.imagePreload()
        this.init()
    }
    
    // テキストのパーツ
    screen = document.getElementById('textScreen')
    dialogueEle = document.getElementById('dialogue')
    dialogueText = document.getElementById('dialogue-text-area')
    autocheck = document.getElementById('autocheck')
    darkeningFloor = document.getElementById('darkening-floor')
    onePicture = document.getElementById('one-picture')

    /**
     * シナリオ画面遷移とイベントの設定
     */
    init(){
        
        this.state.eventState = 'ScenarioPlayer'

        // 初期化
        this.dialogueText.innerHTML=''
        document.getElementById('one-picture-text').innerHTML=''
        document.getElementById('dialogue-name-area').innerHTML=''
        this.autoPlayingCheck=false
        this.startFlag=true

        // イベント付与
        this.screen.addEventListener('click',this.textBoxShowHide,false)    
        this.dialogueEle.addEventListener('click',this.clickDialogue,false)
        this.autocheck.textContent = this.autoPlaying ? 'Auto ON' :'Auto OFF'
        this.autocheck.addEventListener('click',this.autoToggle,false)
        this.darkeningFloor.addEventListener('click',this.darkeningPrev,false)
        this.onePicture.addEventListener('click',this.onePictureClick,false)

        // プリロード
        this.AudioPreload()
        // 1番目に流させる音声を設定
        this.AudioLoading()
    }

    /**
     * クリックされた時にアニメーションを走らせるかどうか
     * @returns キャンセルする
     */
    ScenarioClick = () => {
        let text = this.onePictureSwitch ? document.querySelectorAll('#one-picture-text .op0') : document.querySelectorAll('#dialogue-text-area .op0')

        if (text.length===0 && !this.autoPlaying) {
            this.Loading()
            // console.log(text)
            text = this.onePictureSwitch ? document.querySelectorAll('#one-picture-text .op0') : document.querySelectorAll('#dialogue-text-area .op0')
        }
        if (!this.movingFlag) {
            // this.autoPlayingCheckでautoの待機中にイベントが発生するのを防ぐ
            console.log(this.autoPlaying)
            console.log(this.autoPlayingCheck)
            if (this.autoPlaying && this.autoPlayingCheck) {
                console.log('cancel')//autoの待機中にイベントが発生するのを防ぐ
                return
            }else if(this.autoPlaying && !this.autoPlayingCheck){
                this.autoPlayingCheck=true//auto初回のみ通る
            }
            this.AnimationStart(text)
        }else{
                
            this.AnimationForcedEnd(text)

        }
    }

    /**
     * テキストボックス以外をクリックすると、テキストボックスが消えたり現れたりする
     * @returns イベント削除とキャンセル
     */
    textBoxShowHide = () => {
        if (this.state.textEventId != this.nowEveId) {
            this.screen.removeEventListener('click',this.textBoxShowHide)
            return
        }
        if (this.screenDarking) { //暗転中は動かさない
            return 
        }
        if (this.dialogueFlag) {
            // 非表示
            this.dialogueEle.classList.add('none')
            this.autocheck.classList.add('none')
            this.dialogueFlag=false
            this.AnimationPause()
        }else{
            // 表示
            this.dialogueEle.classList.remove('none')
            this.autocheck.classList.remove('none')
            this.dialogueFlag=true
        }

    }

    /**
     * テキストボックスクリックでアニメーション再生
     * @param {*} e 要素
     * @returns イベント削除とキャンセル
     */
    clickDialogue = e => {
        if (this.state.textEventId!=this.nowEveId) {
            this.dialogueEle.removeEventListener('click',this.clickDialogue)
            return
        }
        e.stopPropagation();//イベントの伝搬を防止
        if (this.startFlag) {
            this.startFlag=false;//いらない？
            this.Loading();
        }else{
            this.ScenarioClick();
        }
    }

    /**
     * AutoのON/OFF
     * @param {*} e 要素
     * @returns イベント削除とキャンセル
     */
    autoToggle = e => {
        if (this.state.textEventId!=this.nowEveId) {
            this.autocheck.removeEventListener('click',this.autoToggle)
            return
        }
        e.stopPropagation();
        this.autoPlaying=this.autoPlaying ? false : true
        e.target.textContent = this.autoPlaying ? 'Auto ON' :'Auto OFF';
        // auto機能をONからOFFに変更したときautoPlayingCheckを初期化
        if (!this.autoPlaying) {
            this.autoPlayingCheck=false;
        }
        //autoで再生中にautoをoffにする時だけ
        if (this.autoPlaying && this.movingFlag) {
            this.autoPlayingCheck=true;
        }
        // console.log(this.autoPlaying);
    }
    
    /**
     * 暗転要素の伝搬禁止
     * @param {*} e 要素
     * @returns イベント削除とキャンセル
     */
    darkeningPrev = e => {
        if (this.state.textEventId!=this.nowEveId) {
            this.darkeningFloor.removeEventListener('click',this.darkeningPrev)
            return
        }
        e.stopPropagation();
    }

    /**
     * 一枚絵の時のイベント発火
     * @param {*} e 要素
     * @returns イベント削除とキャンセル
     */
    onePictureClick = e => {
        if (this.state.textEventId!=this.nowEveId) {
            this.onePicture.removeEventListener('click',this.onePictureClick)
            return
        }
        e.stopPropagation();
        this.ScenarioClick();
    }

    /**
     * テキストを透明にして配置する
     */
    Loading(){

        // 　音声終了
        this.AudioStop()

        if (this.msgindex>=Object.keys(this.TextList).length) {
            return;
            // this.msgindex=0;
        }
        console.log(this.TextList[this.msgindex]);
        
        const spanFragment = document.createDocumentFragment();
        let largeHolder;//大文字格納用

        const pFragment = document.createDocumentFragment();
        let pEle = document.createElement('p')
        let pCount = 0 //行カウント

        let speakerName = this.TextList[this.msgindex]['characterText']['name'];//名前
        for (let i = 0; i < this.TextList[this.msgindex]['characterText']['text'].length; i++) {
            const element = this.TextList[this.msgindex]['characterText']['text'][i];
            if (element === '/') {//赤文字
                // console.log(element);
                if (this.colorFlag) {
                    this.colorFlag=false;
                    continue;
                }
                this.colorFlag=true;
                continue;
            }
            if (element === '*') {//大文字
                // console.log(element);
                if (this.sizeFlag) {
                    this.sizeFlag=false;
                    continue;
                }
                this.sizeFlag=true;
                continue;
            }
            if (element === '$') {// 改行
                pEle.appendChild(spanFragment)
                pEle.dataset.pcount=pCount
                pFragment.appendChild(pEle)
                pEle = document.createElement('p')//初期化
                this.colorFlag = false
                this.sizeFlag = false
                pCount++
                continue;
            }
            const span = document.createElement('span');//1文字格納
            span.textContent=element;
            span.className='op0';
            if (this.colorFlag) {
                span.classList.add('red');
            }
            if (this.sizeFlag) {
                span.classList.add('large');
                if (!largeHolder) {
                    largeHolder=document.createElement('span');
                    largeHolder.className='fast-show';
                }
                // 一枚絵且つ、大文字の時は速めに表示させるので別にする
                if (this.TextList[this.msgindex]['onePicture']) {
                    largeHolder.appendChild(span);
                    // console.log(largeHolder);
                    continue;
                }
            }
            if (largeHolder) {
                spanFragment.appendChild(largeHolder);
            }
            largeHolder=null;
            spanFragment.appendChild(span);
        }
        pEle.appendChild(spanFragment)
        pEle.dataset.pcount=pCount
        pFragment.appendChild(pEle)
        this.colorFlag=false;

        //一枚絵の時
        if (this.TextList[this.msgindex]['onePicture']) {
            this.onePictureSwitch=true;
            // #onePictureに操作
            document.getElementById('one-picture').classList.remove('op0');
            document.getElementById('dialogue').classList.add('op0');
            document.getElementById('one-picture-text').innerHTML='';
            document.getElementById('one-picture-text').appendChild(pFragment);
            // console.log(this.TextList[this.msgindex]);
        }else{
            this.onePictureSwitch=false;
            document.getElementById('one-picture').classList.add('op0');
            document.getElementById('dialogue').classList.remove('op0');
            document.getElementById('dialogue-name-area').classList.add('op0');
            document.getElementById('dialogue-name-area').innerHTML=speakerName;
            document.getElementById('dialogue-text-area').innerHTML='';
            document.getElementById('dialogue-text-area').appendChild(pFragment);
        }

        // 音声再生
        this.AudioPlaying()
        
        this.msgindex++;
    
    }

    /**
     * アニメーション再生
     * @param {*} text cp0クラスがついているspanタグ
     */
    AnimationStart(text){
        this.nowEle = text;
        // console.log(text);
        if (this.toMapFlag) {
            this.toMap() //マップへ戻る(非auto)
            return
        }
        (async()=>{
            
            if (document.getElementById('textBackground').src.indexOf(this.TextList[this.msgindex - 1]['backgroundImage'])===-1) { //画像の変更がある時のみ暗転
                this.screenDarking = true
                document.getElementById('autocheck').classList.add('op0');
                document.getElementById('darkening-floor').classList.remove('op0');//暗転
                await this.timer(500);
                document.getElementById('dialogue-name-area').classList.remove('op0');//名前表示
                this.characterSetting(this.TextList[this.msgindex - 1]['characterList']);//キャラ画像反映
                this.backgroundSetting(this.TextList[this.msgindex - 1]['backgroundImage'])//読み込み終了=>画面反映まで暗転させたい
                // 2秒間暗転させる処理書きたい
                await this.timer(1000);
                document.getElementById('darkening-floor').classList.add('op0');//暗転解除
                document.getElementById('autocheck').classList.remove('op0');
                await this.timer(1000);
                this.screenDarking = false
            }else{
                //画像が同じ=>暗転しない場合
                document.getElementById('dialogue-name-area').classList.remove('op0');//名前表示
                this.characterSetting(this.TextList[this.msgindex - 1]['characterList']);//キャラ画像反映
            }

            // テキスト1文字ずつ描画
            this.movingFlag=true;
            const p = new Promise((resolve,reject)=>{
                (async ()=>{
                    let fastFlag = false;
                    for (const ele of text) {
                        if (!this.movingFlag) {
                            // console.log("stop");
                            if (!this.dialogueFlag) {
                                this.autoPlayingCheck=false;
                                // console.log('');
                                // break
                                return;//オートで再生中にダイアログ非表示で停止させた場合
                            }else{
                                break;//テキスト強制終了でautoで次へい行かせる
                            }
                        }
                        if (!this.dialogueFlag && !this.onePictureSwitch) {
                            this.autoPlayingCheck=false;
                            this.movingFlag=false;
                            // console.log('');
                            // break
                            return;//オートで再生中にダイアログ非表示で停止させた場合
                        }
                        await this.timer(10)
                        if (ele.parentNode.classList.contains('fast-show')) {//1枚絵の時だけ先行して別速度で表示させる
                            fastFlag=true;
                            ele.classList.remove('op0');
                            await this.timer(100)
                        }else{
                            if (fastFlag) {
                                await this.timer(500)
                                fastFlag=false;
                            }
                        }
                    }
                })()
                resolve();
            })
            for (const ele of text) {
                if (!this.movingFlag) {
                    // console.log("stop");
                    if (!this.dialogueFlag) {
                        this.autoPlayingCheck=false;
                        // console.log('');
                        // break
                        return;//オートで再生中にダイアログ非表示で停止させた場合
                    }else{
                        break;//テキスト強制終了でautoで次へい行かせる
                    }
                }
                if (!this.dialogueFlag && !this.onePictureSwitch) {
                    this.autoPlayingCheck=false;
                    this.movingFlag=false;
                    // console.log('');
                    // break;
                    return;//オートで再生中にダイアログ非表示で停止させた場合
                }
                if(!ele.classList.contains('op0')){//アニメーション再スタート時op0持ってない場合は飛ばす
                    continue;
                }
                await this.timer(100);
                // console.log(ele);
                ele.classList.remove('op0');

            }
            this.movingFlag=false;

            const nextFlag = this.msgindex >= Object.keys(this.TextList).length // true => 次がない場合
            if (this.autoPlaying) {

                await this.timer(1000);//この待機中にAnimationStartが走るとおかしくなる
                console.log('auto');
                // console.log(text);
                if (!this.dialogueFlag && !this.onePictureSwitch) {
                    this.autoPlayingCheck=false;
                    return;
                }
                this.Loading();
                const nexttext = this.onePictureSwitch ? document.querySelectorAll('#one-picture-text .op0') : document.querySelectorAll('#dialogue-text-area .op0');
                if(!nextFlag) {
                    this.AnimationStart(nexttext);
                }else{
                    this.toMapFlag = true
                    this.toMap() //マップへ戻る(auto)
                    
                }

            }
            else{
                if (nextFlag) {
                    this.toMapFlag = true
                }
            }
                
        })();
    }
    
    /**
     * シナリオ画面からマップ画面へ戻る
     */
    toMap = () => {
        (async ()=>{

            this.AudioStop()
            console.log("end");
            this.state.eventState = 'map'
            this.screenDarking = true
            // 暗転
            document.getElementById('darkening-floor').classList.remove('op0')
            // タイマー
            await this.timer(1000);
            // シナリオ画面へ遷移
            document.getElementById('textScreen').classList.add('none')
            document.getElementById('mapScreen').classList.remove('none')
            // いろいろ初期化
            document.getElementById('textBackground').src='images/background/concept.png'
            document.querySelector('#character-left img').src='images/character/transparent_background.png'
            document.querySelector('#character-center img').src='images/character/transparent_background.png'
            document.querySelector('#character-right img').src='images/character/transparent_background.png'
            // タイマー
            await this.timer(1000);
            // 暗転解除
            document.getElementById('darkening-floor').classList.add('op0')
            this.screenDarking = false

        })()

    }

    /**
     * アニメーションを一時停止
     */
    AnimationPause () {
        this.movingFlag=false;
    }

    /**
     * アニメーションを再スタート
     * @returns キャンセル
     */
    AnimationRestart () {
        // console.log(this.nowEle);
        if (this.movingFlag) {
            return;
        }
        this.AnimationStart(this.nowEle);
    }

    /**
     * アニメーション再生中に画面タッチがされたら終了させる
     * @param {*} text cp0クラスがついているspanタグ
     */ 
    AnimationForcedEnd(text){
        text.forEach(element => {
            element.classList.remove('op0');
            this.movingFlag=false;

        });
    }

    /**
     * タイマー処理
     * @param {Number} s 遅らせる秒数
     * @returns Promise
     */
    timer(s){
        return new Promise((resolve,reject)=>{
            setTimeout(() => {
                resolve();
            }, s);
        })
    }

    /**
     * キャラを設定する
     * @param {*} props 
     */
    characterSetting (props){
        // console.log(props);
        for (const positon in props) {
            if (Object.hasOwnProperty.call(props, positon)) {
                const element = props[positon];
                const src = `images/character/${element.src}`
                document.querySelector(`#character-area [data-position=${positon}] img`).src= src 
                document.querySelector(`#character-area [data-position=${positon}] img`).alt=element.name
            }
        }
    }

    /**
     * 背景画像設定
     * @param {*} url 
     */
    backgroundSetting (url) {

        // srcを変えるだけだが、切り替えに時間がかかってしまう
        const src = `images/background/${url}`
        document.getElementById('textBackground').src= src

    }

    /**
     * 画像のプリロード
     */
    imagePreload () {
        for (const textEle of this.TextList) {
            // console.log(textEle['backgroundImage'])
            const imgele = document.createElement('img')
            const imgsrc = `images/background/${textEle['backgroundImage']}`
            imgele.src = imgsrc

            for (const key in textEle['characterList']) {
                if (Object.hasOwnProperty.call(textEle['characterList'], key)) {
                    // console.log(textEle['characterList'][key]['src'])
                    const charimgele = document.createElement('img')
                    const charsrc = `images/character/${textEle['characterList'][key]['src']}`
                    charimgele.src =  charsrc
                    
                }
            }
        }
    } 

    /**
     * 音声ファイルのプリロード
     */
    AudioPreload = () =>{
        for (const i in this.audios) {
            if (Object.hasOwnProperty.call(this.audios, i)) {

                const v = this.audios[i];
                let obj = {}
                obj.audio = new Audio(`audio/${v.file}`)
                obj.audio.loop = true
                obj.audio.preload = 'auto'
                obj.audioLoad=false
                this.audioList[i] = obj
                obj.audio.addEventListener('canplaythrough', e => {
                    // console.log('throught');
                        obj.audioLoad = true
                })
                // obj.audio.addEventListener('timeupdate',e=>{
                //     // console.log(obj.audio.currentTime);
                // })

            }
        }

    }

    /**
     * 音声ファイル読み込み・変更
     */
    AudioLoading = () => {
        if (this.audioNum >= this.audios.length) {
            return
        }
        this.audioObj = this.audioList[this.audioNum].audio
        this.audioStart = this.audios[this.audioNum].start
        this.audioEnd = this.audios[this.audioNum].end

    }

    /**
     * 音声再生
     */
    AudioPlaying = () => {
        if (this.msgindex === this.audioStart) {

            if (this.audioList[this.audioNum].audioLoad) {
                console.log('play');
                this.audioObj.play()
            }else{
                console.log('読み込めていない');
                // 再帰で再実行
                this.AudioPlaying()
            }

        }
    }

    /**
     * 音性終了
     */
    AudioStop = () => {
        if (this.msgindex === this.audioEnd + 1) {
            console.log('pause');
            this.audioObj.pause()
            this.audioNum++
            this.AudioLoading()
        }
    }
}