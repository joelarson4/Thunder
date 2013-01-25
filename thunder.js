/* Copyright (c) 2011 by Joe Larson (http://joewlarson.com), MIT License
 
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Th=new (function() { //may get a single option object argument
    this.D_CHANNEL_COUNT  =2;
    this.D_SAMPLE_RATE    =44100;
    this.D_BITS_PER_SAMPLE=16;
    this.D_TEMPO          =100;
    this.D_A4FREQ         =440;
    this.D_MIN_OCTAVE     =0;
    this.D_MAX_OCTAVE     =10;  
    this.D_CENTER_OCTAVE  =4;
    this.D_HALF_STEP_UP   =Math.pow(2,1/12);
    this.D_HALF_STEP_DOWN =1/Math.pow(2,1/12);
    this.D_MAX_SAMPLE_16  =Math.pow(2,16-1)-1; //same for negative to keep it simple           

    var _={};//all private stuff goes here for code cleanliness
    _.initialized=false;

    this.init=function(opt) {
        opt=opt || {};
        
        if(opt.beatSamples)  { opt.tempo=opt.beatSamples/60*this.D_SAMPLE_RATE; }
        
        _.tempo       =opt.tempo || this.D_TEMPO;
        _.beatSamples =Math.floor(opt.beatSamples || 60*this.D_SAMPLE_RATE/_.tempo);
        _.beatMs      =1000 * _.beatSamples / this.D_SAMPLE_RATE;    
        _.beatDuration={ ms: _.beatMs, samples: _.beatSamples };
        _.a4Freq      =opt.a4Freq || this.D_A4FREQ;
        _.channelCount=opt.channelCount || this.D_CHANNEL_COUNT;

        _.notesToFrequency={};
        _.frequencyRoundToNotes={};
        var notshp="A,A#,B,C,C#,D,D#,E,F,F#,G,G#".split(",");
        var notflt="A,Bb,B,C,Db,D,Eb,E,F,Gb,G,Ab".split(",");
        for(var oi=this.D_MIN_OCTAVE; oi<=this.D_MAX_OCTAVE; oi++) {
            for(var ni=0; ni<notshp.length; ni++) {
                var shp=notshp[ni]+oi;
                var flt=notflt[ni]+oi;
                var frq=_.a4Freq*Math.pow(2,oi-this.D_CENTER_OCTAVE)*Math.pow(this.D_HALF_STEP_UP,ni);
                _.notesToFrequency[shp]=frq;
                _.notesToFrequency[flt]=frq;
                _.notesToFrequency[shp.toUpperCase()]=frq;
                _.notesToFrequency[flt.toUpperCase()]=frq;            
                _.frequencyRoundToNotes[Math.round(frq)]={ sharp: shp, flat: flt };
                }
            }
        this.NOTES_SHARP      =notshp;
        this.NOTES_FLAT       =notflt;
        _.NOTES_SHARP_UPPER=notshp.join(",").toUpperCase().split(",");
        _.NOTES_FLAT_UPPER =notflt.join(",").toUpperCase().split(",");
        _.initialized=true;
        };

    this.getMaxSample=function() { return this.D_MAX_SAMPLE_16; };
    this.getTempo=function() { return _.tempo; };
    this.getBeatLength=function() { return _.beatSamples; };
    this.getAFrequency=function() { return _.aFreq; };
    this.getFrequencyForNote=function(not) { return _.notesToFrequency[not.toUpperCase()]; };
    this.getNoteForFrequency=function(frq) { return _.frequencyToNotes[frq]; };
    this.getChannelCount=function() { return _.channelCount; };
    this.pitchToFrequency=function(ptc,reffrq) {// ptc is a pitch like A, A3, 440, -3, +5;
        var ptcspl=ptc.toUpperCase().split(""),
            ptcnum=Number(ptc),
            newfrq, oct;
        reffrq=reffrq || _.a4Freq;
        
        newfrq=reffrq;
        if(ptcspl[0]=="+" || ptcspl[0]=="-") {
            newfrq=reffrq*Math.pow(this.D_HALF_STEP_UP,ptcnum);
            }
        else if(!isNaN(ptcnum)) {
            newfrq=ptcnum;
            }
        else {
            oct=Number(ptcspl[ptcspl.length-1]);
            if(isNaN(oct)) { 
                oct=this.D_CENTER_OCTAVE;
                } 
            else { 
                ptcspl.pop(); //now we'll have just the note
                }

            newfrq=this.getFrequencyForNote(ptcspl.join("")+oct);
            }    
        return newfrq;
        };
    this.frequencyToNote=function(frq) {
        return _.frequencyRoundToNotes[Math.round(frq)];
        };
    this.getOffsetNote=function(not,ofs) { //TODO: this is somewhat redundant with pitchToFrequency, distill into common code
        var nix, 
            oct=Number(not.charAt(not.length-1)); 
        if(isNaN(oct)) { oct=this.D_CENTER_OCTAVE; }
        else { not=not.substring(0,not.length-1); }
        
        not=not.toUpperCase();
        nix=0;
        for(;nix<_.NOTES_SHARP_UPPER.length; nix++) {
            if(_.NOTES_SHARP_UPPER[nix]==not || _.NOTES_FLAT_UPPER[nix]==not) { break; }
            }
        nix+=Number(ofs);
        
        oct=Math.floor((oct*12+nix)/12);

        return _.NOTES_SHARP_UPPER[(nix+_.NOTES_SHARP_UPPER.length*this.D_MAX_OCTAVE)%_.NOTES_SHARP_UPPER.length]+""+oct;
        };
    this.normalizeDuration=function(len) { //len can be number with optional suffix.  100m = 100ms, 1000s, 1b, 
        var smplen=0;
        if(!len) { 
            smplen=0;
            }
        else if(typeof len=="function") {
            smplen=len();
            }
        else if(typeof len=="object") {
            if(len.samples) {
                smplen=len.samples;
                }
            else if(len.ms) {
                smplen=Math.floor(len.ms*this.D_SAMPLE_RATE/1000);
                }
            else if(len.beats) {
                smplen=len.beats*_.beatSamples;
                }
            }
        else if(typeof len=="number") { //beats default
            smplen=_.beatSamples*Number(len);
            }
        else if(len.indexOf("ms")==len.length-2) { //milliseconds
            smplen=_.beatSamples*Number(len.substring(0,len.length-2));
            }
        else if(len.indexOf("m")==len.length-1) { //milliseconds
            smplen=_.beatSamples*Number(len.substring(0,len.length-1));
            }                        
        else if(len.indexOf("s")==len.length-1) { //samples
            smplen=Number(len.substring(0,len.length-1));
            }                        
        else if(len.indexOf("b")==len.length-1) { //beats
            smplen=_.beatSamples*Number(len.substring(0,len.length-1));
            }                        
        else {
            smplen=_.beatSamples*Number(len);
            }
        return { samples: smplen, ms: smplen*1000/this.D_SAMPLE_RATE, beats: smplen/_.beatSamples };
        };
    
    _.serializeForId=function(opt,dep) {
        var oi, str, frs;
        if(!opt) { return "~"; }
        if(!dep) { dep=0; }
        if(dep>3) { return "!"; }
        str="";
        if(typeof opt=="function") { return "()"; }
        else if(typeof opt=="object") {
            frs=true;
            str+=( opt.sort ? "[" : "{" );
            for(oi in opt) {
                if(!frs) { str+=","; }
                frs=false;
                str+=( opt.sort ? "" : oi+":")+_.serializeForId(opt[oi],dep+1);
                }
            str+=( opt.sort ? "]" : "}" );
            return str;
            }
        else { return opt+""; }
        };
    _.getArgumentArray=function(arginp) {
        var argout=[]; for(var ai=0; ai<arginp.length; ai++) { argout.push(arginp[ai]); }  
        return argout;
        };
    _.splitOnWhiteComma=function(txt) { //return an array split on commas or whitespace
        var ai, 
            arr=txt.split(",").join(" ").split(/\s/);                
        for(ai=arr.length-1; ai>-1; ai--) {
            if(arr[ai]==="") { arr.splice(ai,1); }
            }
        return arr;
        };

    _.Wave=function(sno,sn_) {
        var _={
            sound   :sno,
            sound_  :sn_,
            thunder :sn_.thunder,
            thunder_:sn_.thunder_
            };
        this.B64KEY="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        
        this.outString=function(val) {
            for(var li=0; li<val.length; li++) {
                _.out[_.offset++]=val.charCodeAt(li);
                }
            };
        this.outLong=function(val) { //4byte number
            val=this.endianLong(val);
            _.out[_.offset++]=((val >>> 24) & 0xFF);
            _.out[_.offset++]=((val >>> 16) & 0xFF);
            _.out[_.offset++]=((val >>>  8) & 0xFF);
            _.out[_.offset++]=((val >>>  0) & 0xFF);
            };
        this.outShort=function(val) { //2byte
            val=this.endianShort(val);
            _.out[_.offset++]=((val >>>  8) & 0xFF);
            _.out[_.offset++]=((val >>>  0) & 0xFF);
            };
        this.outSample=function(val) { 
            _.out[_.offset++]=((val >>>  0) & 0xFF);
            _.out[_.offset++]=((val >>>  8) & 0xFF);
            };
        this.endianShort=function(val) { //big to little for shorts
            return (((val >> 8) & 0x00ff)+
                   ( (val << 8) & 0xff00));
            };
        this.endianLong=function(val) { ///big to little for longs
            return ((val & 0xff    ) << 24)+
                   ((val & 0xff00  ) <<  8)+
                   ((val & 0xff0000) >>  8)+
                   ((val >> 24) & 0xff);
            };
        this.b64encode=function(inparr) {
            var outarr=[];
            var ii=0;
     
            while(ii < inparr.length) {
                var cha=[inparr[ii++],inparr[ii++],inparr[ii++]];
                var enc=[ cha[0] >> 2,
                        ((cha[0] &  3) << 4) | (cha[1] >> 4),
                        ((cha[1] & 15) << 2) | (cha[2] >> 6),
                          cha[2] & 63  ];
     
                if(isNaN(cha[1]))      { enc[2]=64; enc[3]=64; } 
                else if(isNaN(cha[2])) { enc[3]=64; }
     
                outarr.push(this.B64KEY.charAt(enc[0]),this.B64KEY.charAt(enc[1]),this.B64KEY.charAt(enc[2]),this.B64KEY.charAt(enc[3]));
                }
            return outarr.join("");
            };
        this.start=function() {
            _.buf=[];//array of shorts
            _.out=[];
            _.samplesWritten  =0;
            _.sampleDataOffset=0;
            _.offset          =0;
            _.sampleRate      =_.thunder.D_SAMPLE_RATE; //note that we don't use defaults for all these values, only those I might later expose as settable
            _.bytesPerSample  =Math.floor(_.thunder.getChannelCount()*_.thunder.D_BITS_PER_SAMPLE/8);
            
            // Chunk metadata.
            this.outString("RIFF");
            // Size of chunk (fill in later). This is the size of entire file minus 8 bytes
            // (byt.e. the size of everything following this int).
            this.outLong(0);
            
            
            // Chunk header.
            this.outString("WAVE");
            this.outString("fmt ");
            this.outLong(16); // Remainder of the chunk header is 16 bytes
            this.outShort(1); // 1=PCM.
            this.outShort(_.thunder.getChannelCount());
            this.outLong(_.sampleRate);      
            this.outLong(_.sampleRate*_.bytesPerSample); 
            this.outShort(_.bytesPerSample);  
            this.outShort(_.thunder.D_BITS_PER_SAMPLE); 
            
            this.outString("data");
            this.outLong(0); // This is the number of bytes in the wave data, and gets filled in later
            };
        this.write=function(ch1, ch2) {
            _.channel1=ch1;
            _.channel2=ch2;
            if(!ch2) ch2=ch1;
            var len=Math.min(ch1.length, ch2.length);
            for(var li=0; li<len; li++) {
                this.outSample(ch1[li] || 0);
                this.outSample(ch2[li] || 0);
                }
            _.samplesWritten+=len;
            };
        this.finish=function() {
            _.offset=4;
            this.outLong(_.samplesWritten*_.bytesPerSample+36);
            _.offset=40;
            this.outLong(_.samplesWritten*_.bytesPerSample);            
            return new Audio("data:audio/wav;base64,"+this.b64encode(_.out));
            };    
        this.createAudio=function(ch1,ch2) {
            this.start();
            this.write(ch1,ch2);
            var aud=this.finish();
            _.out=null; //TODO: clear this at a better point
            return aud;
            };
        this.play=function(ch1,ch2) {
            this.create(ch1,ch2).play();
            };    
        };
    _.Effects={
        _:{
            thunder :this,
            thunder_:_,
            calcAdvance:function(prm,pos) { //for array or object 
                for(var pi=1; pi<prm.length; pi++) {
                    if(prm[pi].loc>pos) {
                        var va1=prm[pi-1].step;
                        var va2=prm[pi].step;
                        var dst=prm[pi].loc-prm[pi-1].loc;
                        var ds1=pos-prm[pi-1].loc;
                        var ds2=prm[pi].loc-pos;
                        return va1*(ds2/dst)+va2*(ds1/dst);
                        }
                    }
                return 1;
                },
            normNumberParm:function(prm,strdft,strflb) {
                var val, typ, newprm, ai, oi;
                if(typeof prm=="string") {
                    prm=strdft[prm] || strflb || 1;
                    }
                val=prm;//step
                typ=( typeof prm );
                
                if(typ=="object") {
                    newprm=[];
                    if(val.sort) {
                        for(ai=0; ai<val.length; ai++) {
                            newprm.push({loc:ai/(val.length-1),step:val[ai]});
                            }
                        }
                    else {
                        for(oi in val) {
                            if(oi<0 || oi>1) continue; 
                            newprm.push({loc:oi,step:val[oi]});
                            }
                        }
                    newprm.sort(function(a,b) { return a.loc-b.loc; });
                    val=newprm;
                    
                    if(val.length==1) { 
                        val=val[0].step;
                        typ="number";
                        }
                    }     
                return { type: typ, value: val };
                }
            },
        speed:function(prm, charef) {
            var chanew, ci, ai, pi, prmnor, minpos, maxpos, maxval, stpval, smpval, sca;
            prmnor=this._.normNumberParm(prm,{up:this._.thunder.D_HALF_STEP_UP,down:this._.thunder.D_HALF_STEP_DOWN},1);
            chanew=[];
            for(ci=0; ci<charef.length; ci++) {
                chanew.push([]);
                for(ai=0; ai<charef[ci].length; ai+=stpval) {
                    stpval=( prmnor.type=="number" ? prmnor.value : this._.calcAdvance(prmnor.value,ai/charef[ci].length) );
                    minpos=Math.floor(ai);
                    maxpos=Math.min(charef[ci].length-1,Math.ceil(ai+stpval));
                    maxval=0; 
                    smpval=0;
                    for(pi=minpos; pi<maxpos; pi++) {
                        sca=1/(1+Math.abs(pi-ai));
                        maxval+=sca;
                        smpval+=charef[ci][pi]*sca;
                        }
                    chanew[ci].push(Math.floor(smpval/maxval));
                    }
                }
            return chanew;
            },
        volume:function(prm, charef) {
            var prmnor, chanew, ci, ai, val;
            prmnor=this._.normNumberParm(prm,{up:this._.thunder.D_HALF_STEP_UP,down:this._.thunder.D_HALF_STEP_DOWN},1);

            chanew=[];
            for(ci=0; ci<charef.length; ci++) {
                chanew.push([]);
                for(ai=0; ai<charef[ci].length; ai++) {
                    val=( prmnor.type=="number" ? prmnor.value : this._.calcAdvance(prmnor.value,ai/charef[ci].length) );
                    chanew[ci].push(Math.floor(val*charef[ci][ai]));
                    }
                }
            return chanew;
            },           
        noise:function(prm, charef) {
            var prmnor, chanew, ci, ai, val;
            prmnor=this._.normNumberParm(prm,{up:this._.thunder.D_HALF_STEP_UP,down:this._.thunder.D_HALF_STEP_DOWN},1);

            chanew=[];
            for(ci=0; ci<charef.length; ci++) {
                chanew.push([]);
                for(ai=0; ai<charef[ci].length; ai++) {
                    val=( prmnor.type=="number" ? prmnor.value : this._.calcAdvance(prmnor.value,ai/charef[ci].length) );
                    chanew[ci].push( Math.floor(val*(Math.random()*2-1)*this._.thunder.getMaxSample()) +charef[ci][ai] );
                    }
                }
            return chanew;
            },
        sample:function(prm, charef, extopt) {
            var ci, ai, chanew=[];
            if(typeof prm!="function") { return charef; }
            for(ci=0; ci<charef.length; ci++) {
                chanew.push([]);
                for(ai=0; ai<charef[ci].length; ai++) {
                    chanew[ci].push(prm(charef[ci][ai], ai, charef[ci].length, ci, extopt));
                    }
                }
            return chanew;
            },
        pitch:function(prm, charef, extopt) {
            var pi, orgfrq, newfrq, 
                prmpre={};
            if(typeof prm=="string") {
                prmpre["0"]=prm;
                }
            else {
                prmpre=prm;
                }
            for(pi in prmpre) {
                orgfrq=extopt.freq;
                newfrq=this._.thunder.pitchToFrequency(prmpre[pi],orgfrq); //like: A, A3, 440, -3, +5
                prmpre[pi]=newfrq/orgfrq;
                }
            return this.speed(prmpre, charef);
            },
        mix:function(prm, charef) {
            var sndarr, chanew, chamix, len, ai, si, ci, smp;
            if(typeof prm=="string") prm=this._.thunder.Sound.get(prm); 
            if(typeof prm!="object") return charef; 
            sndarr=( prm.sort ? prm : [prm] );
            chanew=[];
            for(si=0; si<sndarr.length; si++) {
                if(typeof sndarr[si]=="string") sndarr[si]=this._.thunder.Sound.get(sndarr[si]);
                }
            
            for(ci=0; ci<charef.length; ci++) {
                chamix=[];
                len=charef[ci].length;
                for(si=0; si<sndarr.length; si++) {
                    chamix.push(sndarr[si].getSampleArray(ci+1));
                    len=Math.max(len,chamix[chamix.length-1].length);
                    }
                
                chanew.push([]);
                for(ai=0; ai<len; ai++) {
                    smp=( charef[ci][ai] || 0 );
                    for(si=0; si<sndarr.length; si++) {
                        smp+=( chamix[si][ai] || 0 );
                        }
                    chanew[ci].push(smp);
                    }
                }
            return chanew;
            }
        }; 


    this.Sound=new (function(tho,th_) {
        var _={
            thunder  :tho,      
            thunder_ :th_,      
            map      :{},       
            counter  :0         
            };

        this.create=function() { //create and return a new ThunderSound object
            var arg=_.thunder_.getArgumentArray(arguments);//expecting arguments: [id], ch1 [, ch2] [, options ]
            var id ="Sound_"+_.counter++;
            if(typeof arg[0]=="string") id=arg.shift();
            var opt=arg.pop();
            if(typeof opt!="object" || opt.sort) { arg.push(opt); opt=null; }
            var ch1=arg.shift() || null; //may not be there
            var ch2=arg.shift() || null; //may not be there

            var ThSound=new (function(sno,sn_,id,ch1,ch2,opt) {
                var oi,
                    _={
                        sound       :sno,
                        sound_      :sn_,
                        thunder     :sn_.thunder,
                        thunder_    :sn_.thunder_,
                        id          :id ,
                        arg_ch1     :ch1,
                        arg_ch2     :ch2,
                        arg_options :opt,
                        ch1         :[],
                        ch2         :[] 
                        };
                this.type="ThSound";
                opt=opt || {}; 
                
                _.duration=( opt.duration ? _.thunder.normalizeDuration(opt.duration) : _.thunder_.beatDuration );
                _.freq    =opt.freq   || _.thunder_.a4Freq;
                
                _.ext_opt={}; for(oi in opt) _.ext_opt[oi]=opt[oi];
                _.ext_opt.freq     =_.freq;
                _.ext_opt.duration=_.duration;
                
                var rndcha=function(chf, len, frq, opt, chn) { //expecting: channel function, length, channel number, sound options, 
                    var arr=[];
                    for(var si=0; si<len; si++) {
                        arr.push(chf(si, len, frq, chn, opt));
                        }
                    return arr;
                    };
                
                var ch1typ=( typeof ch1=="object" && ch1.sort ? "array" : typeof ch1 );
                var ch2typ=( typeof ch1=="object" && ch2.sort ? "array" : typeof ch2 );                                        
                
                if(ch1typ=="array" && !_.duration) _.duration=ch1.length;
                if(ch2typ=="array" && _.duration ) _.duration=Math.max(_.duration, ch2.length );            
                if(ch2typ=="array" && !_.duration) _.duration=ch2.length;

                _.ch1arr=( ch1typ=="array"    ? ch1 
                         : ch1typ=="function" ? rndcha(ch1,_.duration.samples,_.freq,opt,1) :
                           null
                           );

                _.ch2arr=( ch2typ=="array"    ? ch2 
                         : ch2typ=="function" ? rndcha(ch2,_.duration.samples,_.freq,opt,2) :
                           null
                           );          

                this.getAudio=function() {
                    _.audio=( _.audio || (new _.thunder_.Wave(_.sound,_.sound_)).createAudio(_.ch1arr,_.ch2arr) );
                    
                    _.ch1arr=null; //TODO: clear this at a smarter point
                    _.ch2arr=null;
                    
                    return _.audio;
                    };

                this.getId=function() { return _.id; };
                this.play =function(dlydur) {  
                    var plaidn=_.id;
                    if(!dlydur) { this.getAudio().play(); return; }
                    setTimeout(function() {
                        Th.Sound.get(plaidn).play();
                        },_.thunder.normalizeDuration(dlydur).ms);
                    };
                this.getSampleArray=function(chn) { return _[ chn==2 ? "ch2arr" : "ch1arr" ]; };
                
                this.effect=function() {
                    var ai, nam, prm, chanew;
                    //expecting arguments: name, parms, [,name, parms]... -- as many pairs as you want, and what parms is differs by effect
                    chanew=[_.ch1arr,_.ch2arr];
                    for(ai=0; ai<arguments.length; ai+=2) {
                        nam=arguments[ai];
                        prm=arguments[ai+1];
                        chanew=_.thunder_.Effects[nam](prm,chanew,_.ext_opt);
                        }
                    return _.thunder.Sound.create("S",chanew[0],chanew[1],_.ext_opt);
                    };
                
                this.destroy=function() {
                    var oi;
                    for(oi in _) {
                        delete _[oi];
                        }
                    };
                
                })(this,_,id,ch1,ch2,opt);
                
            _.map[id]=ThSound;
            return ThSound;
            };
            
        this.get=function(id) { return _.map[id]; };
        this.destroy=function(id) { 
            _.map[id].destroy(); 
            delete _.map[id];
            };
        })(this,_);


    this.Inst=new (function(tho,th_) {
        var _={
            thunder  :tho,    
            thunder_ :th_,    
            map      :{},     
            counter  :0       
            }; 

        this.create=function() { //create and return a new ThunderInst object
            var arg=_.thunder_.getArgumentArray(arguments);//expecting arguments: [id] [, ch1] [, ch2] [, options ]
            var id ="Inst_"+_.counter++;
            if(typeof arg[0]=="string") id=arg.shift(); 
            var opt=arg.pop();
            if(typeof opt!="object" || opt.sort) { arg.push(opt); opt=null; }
            var ch1=arg.shift() || null; //may not be there
            var ch2=arg.shift() || null; //may not be there

            var ThInst=new (function(ino,in_,id,ch1,ch2,opt) {
                var oi,
                    _={
                        inst        :ino,
                        inst_       :in_,
                        thunder     :in_.thunder,
                        thunder_    :in_.thunder_,
                        id          :id ,
                        arg_ch1     :ch1,
                        arg_ch2     :ch2,
                        arg_options :opt,
                        sounds      :{}
                        };
                this.type="ThInst";
                opt=opt || {}; 

                _.duration=( opt.duration ? _.thunder.normalizeDuration(opt.duration) : _.thunder_.beatDuration );
                
                _.ext_opt={}; for(oi in opt) _.ext_opt[oi]=opt[oi];
                _.ext_opt.duration=_.duration;

                this.getSound=function(ptc,opt) {
                    var frq, id, snd, oi;
                    opt=opt || {};
                    frq=_.thunder.pitchToFrequency(ptc);
                    id=_.id+"_"+ptc+( opt ? ":"+_.thunder_.serializeForId(opt) : "" );
                    opt.freq =opt.freq || frq;
                    opt.pitch=opt.pitch || ptc;
                    opt.duration=( opt.duration ? _.thunder.normalizeDuration(opt.duration) : _.duration );
                    
                    for(oi in _.ext_opt) { if(!opt[oi]) opt[oi]=_.ext_opt[oi]; }
                    
                    snd=_.sounds[id];
                    if(!snd) {
                        snd=_.thunder.Sound.create(id,_.arg_ch1,_.arg_ch2,opt);
                        _.sounds[id]=snd;
                        }
                    return snd;
                    };
                this.getId=function() { return _.id; };
                
                })(this,_,id,ch1,ch2,opt);
                
            _.map[id]=ThInst;
            return ThInst;
            };            

        this.get=function(id) { return _.map[id]; };
        })(this,_);         
        

    this.Sequence=new (function(tho,th_) {
        var _={
            thunder  :tho,    
            thunder_ :th_,    
            map      :{},     
            counter  :0       
            }; 

        this.create=function() { //create and return a new ThunderSequence object
            var arg, id, opt, ins, ntn, eqlspl, sp2, tmp, out, len, not, bea, ThSequence;
            arg=_.thunder_.getArgumentArray(arguments);//expecting arguments: [id] , inst, [, notation] [, options ]
            id ="Sequence_"+_.counter++; 
            if(typeof arg[0]=="string") id=arg.shift();
            opt=arg.pop();
            if(typeof opt!="object" || opt.sort) { arg.push(opt); opt=null; } //we only think it's options if it's a non-array object
            ins=arg.shift(); //instruments may be a string id, a ThInst object, a ThSound object, or an array of those 
            ntn=arg.shift(); //may not be there
            
            ThSequence=new (function(sqo,sq_,id,ins,ntn,opt) {
                var ntnmus, ntnset, ntnnam, ni, beastr, insidx, haschr, 
                    spl, chrdot, chroct, chrlen, chrnot, chrnotlen, 
                    sub, maj, min, oct, roo, ci, ii, _;
                _={
                    sequence     :sqo,
                    sequence_    :sq_,
                    thunder      :sq_.thunder,
                    thunder_     :sq_.thunder_,
                    id           :id ,
                    arg_inst     :ins,
                    arg_notation :ntn,
                    arg_options  :opt,
                    inst         :null //set later
                    };
                this.type="ThSequence";
                opt=opt || {}; 
                
                _.tempo       =opt.tempo  || _.thunder_.tempo;
                _.octave      =opt.octave || _.thunder.D_CENTER_OCTAVE;
                _.noteLength  =opt.noteLength || 1;
                _.loops       =opt.loops      || 1;

                if(typeof ins!="object" || !ins.sort) { ins=[ins]; }
                for(ii=0; ii<ins.length; ii++) {
                    if(typeof ins[ii]=="string") { 
                        ins[ii]=( _.thunder.Inst.get(ins[ii]) || _.thunder.Sound.get(ins[ii]) ); 
                        }
                    else if(ins[ii].type=="ThSound") {
                        ins[ii]=_.thunder.Inst.create("Inst_"+ins[ii].getId(),ins[ii]);
                        }
                    //otherwise, it's already a ThInst and we are good
                    }
                _.inst=ins;
                
                //Now we parse out the notation.  We are using RTTTL with some relaxations and additions.  But RTTTL input should work always
                //example: ScoobyDoo:d=4,o=5,b=160:8e6,8e6,8d6,8d6,2c6,8d6,e6,2a,8a,b,g,e6,8d6,c6,8d6,2e6,p,8e6,8e6,8d6,8d6,2c6,8d6,f6,2a,8a,b,g,e6,8d6,2c6
                //see: http://www.ez4mobile.com/nokiatone/rtttf.htm
                ntn=ntn.split(":");
                ntnmus=ntn.pop(); //the music portion of the notation
                ntnset=ntn.pop(); //the settings portion, if any
                ntnnam=ntn.pop(); //the name poriton, if any
                
                _.notationName=ntnnam; //informational only

                if(ntnset) {
                    //this may not be the smartest way to fix up this string, regex wizards please help!
                    while(ntnset.indexOf(" =")>-1) { ntnset=ntnset.split(" =").join("="); }
                    while(ntnset.indexOf("= ")>-1) { ntnset=ntnset.split("= ").join("="); }                    
                    ntnset=_.thunder_.splitOnWhiteComma(ntnset.toUpperCase());
                    
                    for(ni=0; ni<ntnset.length; ni++) {
                        eqlspl=ntnset[ni].split("=");
                        if(     eqlspl[0]=="D") _.noteLength  =Number(eqlspl[1]);
                        else if(eqlspl[0]=="O") _.octave      =Number(eqlspl[1]);
                        else if(eqlspl[0]=="B") _.tempo       =Number(eqlspl[1]);  
                        else if(eqlspl[0]=="L") _.loops       =Number(eqlspl[1]);  //added concept: loop
                        }
                    }

                _.beatSamples=60*_.thunder.D_SAMPLE_RATE/_.tempo;
                _.beatMs     =60*1000/_.tempo;    
                _.beatDuration={ ms: _.beatMs, samples: _.beatSamples };

                haschr=( ntnmus.indexOf("(")>-1 ); //has chords
                ntnmus=ntnmus.split("M").join("J"); //internally we use J for major.  M means minor because it's uppercased
                ntnmus=_.thunder_.splitOnWhiteComma(ntnmus.toUpperCase());
                beastr=0;
                insidx=0;
                _.score=[];
                if(haschr) {                    
                    //- allow chords using (). 
                    //  (G) would be a G major chord in default octave
                    //  (Gj) will also be considered major.  this allows for easily building up more complex chords
                    //  2(Gm)3 is a G minor for 2 beats in octave 3.  
                    //  3(A E1 G0) is a chord composed of A in the default octave, E1 and G0, played for 3 beats
                    //  others: 2(Gm).3
                    //  we don't try to accomodate 9th, 7th, diminished, whatever -- people can construct those by hand!
                    for(ni=ntnmus.length-1; ni>-1; ni--) {
                        if(ntnmus[ni].indexOf(")")>-1) { 
                            //first we build an array of the seperate notes involved, and also get the duration and octave, by parsing and stepping backwards until we get a open paren    
                            spl=ntnmus[ni].split(")"); 
                            chrdot=( spl[1] && spl[1].indexOf(".")>-1 ); 
                            if(chrdot) spl[1]=spl[1].split(".").join("");
                            chroct=Number(spl[1]); if(isNaN(chroct)) chroct=_.octave; //chord octave
                            chrlen=_.noteLength/( chrdot ? 1.5 : 1 );
                            chrnot=[];
                            
                            if(spl[0].indexOf("(")>-1) { //check if this is the beginning paren also
                                ntnmus[ni]=spl[0];
                                ni++;                                
                                }
                            else if(spl[0]!=="") { //nonblank means its a note to be included
                                chrnot.push(spl[0]); 
                                ntnmus.splice(ni,1); //remove current node, so we can reinsert with same code
                                }
                            else {
                                ntnmus.splice(ni,1); //remove current node, so we can reinsert with same code
                                }
                            //alert("A: "+ntnmus+" \n "+chrnot+" : "+ni); 
                            
                            while(ni>0 && ntnmus.length>0) {
                                ni--;
                                if(ntnmus[ni].indexOf("(")>-1) {
                                    sp2=ntnmus[ni].split("("); 
                                    if(sp2[0]!=="") chrlen=Number(sp2[0])/( chrdot ? 1.5 : 1 );
                                    if(sp2[1]!=="") chrnot.push(sp2[1]);
                                    ntnmus.splice(ni,1); //delete current node
                                    break;
                                    }
                                else {
                                    chrnot.push(ntnmus[ni]);
                                    ntnmus.splice(ni,1); //delete current node                                    
                                    }
                                }
                            //alert("B: "+ntnmus+" \n "+chrnot+" : "+ni); 
                            
                            //now we have an array of notes.  but some may be chords.
                            
                            //if we have a single note, make sure it's major or minor.  So G becomes GJ, Gm is GM
                            if(chrnot.length==1 && chrnot[0].indexOf("J")<0 && chrnot[0].indexOf("M")<0) {
                                tmp=chrnot[0].split("");
                                tmp.splice(1,0,"J");
                                chrnot[0]=tmp.join("");
                                }
                            
                            //now we split out the chords into component notes
                            chrnotlen=chrnot.length;
                            for(ci=0; ci<chrnotlen; ci++) {
                                sub=chrnot[ci];
                                maj=(sub.indexOf("J")>-1); if(maj) sub=sub.split("J").join("");
                                min=(sub.indexOf("M")>-1); if(min) sub=sub.split("M").join("");
                                oct=Number(sub.charAt(sub.length-1)); 
                                if(isNaN(oct)) { oct=_.octave; }
                                else { sub=sub.substring(0,sub.length-1); }
                                roo=sub+oct; 
                                chrnot[ci]=roo;
                                if(maj) {
                                    chrnot.push(_.thunder.getOffsetNote(roo,4));//4 semitones means major third
                                    chrnot.push(_.thunder.getOffsetNote(roo,7));//7 semitones means perfect fifth
                                    }
                                else if(min) {
                                    chrnot.push(_.thunder.getOffsetNote(roo,3));//3 semitones means minor third
                                    chrnot.push(_.thunder.getOffsetNote(roo,7));//7 semitones means perfect fifth
                                    }
                                }
                            
                            //alert("C: "+ntnmus+" \n "+chrnot+" : "+ni);
                            
                            for(ci=0; ci<chrnot.length; ci++) {
                                if(ci>0) ntnmus.splice(ni,0, chrlen+"K"); //insert backtrack
                                ntnmus.splice(ni,0, chrlen+chrnot[ci]); //insert note
                                }
                            //alert("D: "+ntnmus+" \n "+chrnot+" : "+ni); 
                            }   
                        }
                    }

                for(ni=0; ni<ntnmus.length; ni++) {
                    out=ntnmus[ni].split(/[A-Z]/); //gives us the piece before and after note
                    len=Number(out[0]) || _.noteLength;
                    not=ntnmus[ni].substring(out[0].length,ntnmus[ni].length-out[1].length);
                    if(out[1].indexOf(".")>-1) { len/=1.5; out[1]=out[1].split(".").join(""); }
                    if(out[1].indexOf("#")>-1) { not+="#"; out[1]=out[1].split("#").join(""); }
                    oct=Number(out[1]); if(out[1]==="" || isNaN(oct)) oct=_.octave;  
                    
                    bea=4/len; //TODO: incorperate notion of a time signature. 4 means default quarter notes -- not necessarily so.
                    
                    if(not=="P") { //pause
                        beastr+=bea;
                        }
                    else if(not=="K") { //backtrack by beats
                        beastr-=bea;
                        }
                    else if(not=="R") { //realign to nearest 
                        beastr=bea*Math.ceil(beastr/bea);
                        }                        
                    else if(not=="I") { //change instruments
                        insidx=Number(out[1]); //we re-number it, because if it's inst 0, that would have evaluated to falsey which would mean we'd have octave here...
                        }  
                    else {
                        not+=oct;
                        _.score.push({ start: beastr, note: not, durationBeats: bea, instIndex: insidx });
                        beastr+=bea;    
                        }

                    }
                _.sequenceBeats=beastr;
                
                this.getName=function() { return _.notationName || _.id; };
                this.getId=function() { return _.id; };
                
                this.play=function() {
                    for(var li=0; li<_.loops; li++) { 
                        for(var si=0; si<_.score.length; si++) { 
                            var strmsc=_.score[si].start*_.beatMs+_.sequenceBeats*li*_.beatMs;
                            var dursmp=_.score[si].durationBeats*_.beatSamples+"s";
                            var insidn=_.inst[_.score[si].instIndex].getId();
                            setTimeout("Th.Inst.get('"+insidn+"').getSound('"+_.score[si].note+"',{duration:'"+dursmp+"'}).play()",strmsc);
                            }
                        }
                    };
                
                })(this,_,id,ins,ntn,opt);
                
            _.map[id]=ThSequence;
            return ThSequence;
            };            

        this.get=function(id) { return _.map[id]; };
        })(this,_);                 
        
    })();

