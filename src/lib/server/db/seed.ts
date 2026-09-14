import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { notes, NoteType } from "./fsrs.schema.ts";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

type VocabularySentence = {
	sentence: string;
	meaning: string;
	furigana: string;
};

type VocabularyMetadata = {
	word: string;
	word_reading: string;
	word_meaning: string;
	word_furigana: string;
	word_sentences: VocabularySentence[];
};

const vocabulary: VocabularyMetadata[] = [
	{
		word: "無い",
		word_reading: "ない",
		word_meaning: "no ser, no existir",
		word_furigana: "無[な]い",
		word_sentences: [
			{
				sentence: "今はあまり時間が**無い**のです。",
				meaning: "No tengo mucho tiempo ahora.",
				furigana: "今[いま]はあまり時間[じかん]が**無[な]い**のです。"
			}
		]
	},
	{
		word: "食べる",
		word_reading: "たべる",
		word_meaning: "comer",
		word_furigana: "食[た]べる",
		word_sentences: [
			{
				sentence: "朝ご飯を**食べる**。",
				meaning: "Como el desayuno.",
				furigana: "朝[あさ]ご飯[はん]を**食[た]べる**。"
			}
		]
	},
	{
		word: "飲む",
		word_reading: "のむ",
		word_meaning: "beber",
		word_furigana: "飲[の]む",
		word_sentences: [
			{
				sentence: "水を**飲む**。",
				meaning: "Bebo agua.",
				furigana: "水[みず]を**飲[の]む**。"
			}
		]
	},
	{
		word: "行く",
		word_reading: "いく",
		word_meaning: "ir",
		word_furigana: "行[い]く",
		word_sentences: [
			{
				sentence: "学校へ**行く**。",
				meaning: "Voy a la escuela.",
				furigana: "学校[がっこう]へ**行[い]く**。"
			}
		]
	},
	{
		word: "来る",
		word_reading: "くる",
		word_meaning: "venir",
		word_furigana: "来[く]る",
		word_sentences: [
			{
				sentence: "友達が**来る**。",
				meaning: "Viene un amigo.",
				furigana: "友達[ともだち]が**来[く]る**。"
			}
		]
	},
	{
		word: "見る",
		word_reading: "みる",
		word_meaning: "ver",
		word_furigana: "見[み]る",
		word_sentences: [
			{
				sentence: "映画を**見る**。",
				meaning: "Veo una película.",
				furigana: "映画[えいが]を**見[み]る**。"
			}
		]
	},
	{
		word: "聞く",
		word_reading: "きく",
		word_meaning: "escuchar, preguntar",
		word_furigana: "聞[き]く",
		word_sentences: [
			{
				sentence: "音楽を**聞く**。",
				meaning: "Escucho música.",
				furigana: "音楽[おんがく]を**聞[き]く**。"
			}
		]
	},
	{
		word: "話す",
		word_reading: "はなす",
		word_meaning: "hablar",
		word_furigana: "話[はな]す",
		word_sentences: [
			{
				sentence: "日本語を**話す**。",
				meaning: "Hablo japonés.",
				furigana: "日本語[にほんご]を**話[はな]す**。"
			}
		]
	},
	{
		word: "読む",
		word_reading: "よむ",
		word_meaning: "leer",
		word_furigana: "読[よ]む",
		word_sentences: [
			{
				sentence: "本を**読む**。",
				meaning: "Leo un libro.",
				furigana: "本[ほん]を**読[よ]む**。"
			}
		]
	},
	{
		word: "書く",
		word_reading: "かく",
		word_meaning: "escribir",
		word_furigana: "書[か]く",
		word_sentences: [
			{
				sentence: "手紙を**書く**。",
				meaning: "Escribo una carta.",
				furigana: "手紙[てがみ]を**書[か]く**。"
			}
		]
	},
	{
		word: "買う",
		word_reading: "かう",
		word_meaning: "comprar",
		word_furigana: "買[か]う",
		word_sentences: [
			{
				sentence: "服を**買う**。",
				meaning: "Compro ropa.",
				furigana: "服[ふく]を**買[か]う**。"
			}
		]
	},
	{
		word: "作る",
		word_reading: "つくる",
		word_meaning: "hacer, crear",
		word_furigana: "作[つく]る",
		word_sentences: [
			{
				sentence: "料理を**作る**。",
				meaning: "Hago comida.",
				furigana: "料理[りょうり]を**作[つく]る**。"
			}
		]
	},
	{
		word: "使う",
		word_reading: "つかう",
		word_meaning: "usar",
		word_furigana: "使[つか]う",
		word_sentences: [
			{
				sentence: "パソコンを**使う**。",
				meaning: "Uso la computadora.",
				furigana: "パソコンを**使[つか]う**。"
			}
		]
	},
	{
		word: "待つ",
		word_reading: "まつ",
		word_meaning: "esperar",
		word_furigana: "待[ま]つ",
		word_sentences: [
			{
				sentence: "友達を**待つ**。",
				meaning: "Espero a un amigo.",
				furigana: "友達[ともだち]を**待[ま]つ**。"
			}
		]
	},
	{
		word: "会う",
		word_reading: "あう",
		word_meaning: "encontrarse con",
		word_furigana: "会[あ]う",
		word_sentences: [
			{
				sentence: "先生に**会う**。",
				meaning: "Me encuentro con el profesor.",
				furigana: "先生[せんせい]に**会[あ]う**。"
			}
		]
	},
	{
		word: "立つ",
		word_reading: "たつ",
		word_meaning: "ponerse de pie",
		word_furigana: "立[た]つ",
		word_sentences: [
			{
				sentence: "椅子から**立つ**。",
				meaning: "Me levanto de la silla.",
				furigana: "椅子[いす]から**立[た]つ**。"
			}
		]
	},
	{
		word: "座る",
		word_reading: "すわる",
		word_meaning: "sentarse",
		word_furigana: "座[すわ]る",
		word_sentences: [
			{
				sentence: "椅子に**座る**。",
				meaning: "Me siento en la silla.",
				furigana: "椅子[いす]に**座[すわ]る**。"
			}
		]
	},
	{
		word: "歩く",
		word_reading: "あるく",
		word_meaning: "caminar",
		word_furigana: "歩[ある]く",
		word_sentences: [
			{
				sentence: "公園を**歩く**。",
				meaning: "Camino por el parque.",
				furigana: "公園[こうえん]を**歩[ある]く**。"
			}
		]
	},
	{
		word: "走る",
		word_reading: "はしる",
		word_meaning: "correr",
		word_furigana: "走[はし]る",
		word_sentences: [
			{
				sentence: "毎朝**走る**。",
				meaning: "Corro cada mañana.",
				furigana: "毎朝[まいあさ]**走[はし]る**。"
			}
		]
	},
	{
		word: "泳ぐ",
		word_reading: "およぐ",
		word_meaning: "nadar",
		word_furigana: "泳[およ]ぐ",
		word_sentences: [
			{
				sentence: "プールで**泳ぐ**。",
				meaning: "Nado en la piscina.",
				furigana: "プールで**泳[およ]ぐ**。"
			}
		]
	},
	{
		word: "寝る",
		word_reading: "ねる",
		word_meaning: "dormir",
		word_furigana: "寝[ね]る",
		word_sentences: [
			{
				sentence: "早く**寝る**。",
				meaning: "Duermo temprano.",
				furigana: "早[はや]く**寝[ね]る**。"
			}
		]
	},
	{
		word: "起きる",
		word_reading: "おきる",
		word_meaning: "despertarse, levantarse",
		word_furigana: "起[お]きる",
		word_sentences: [
			{
				sentence: "六時に**起きる**。",
				meaning: "Me levanto a las seis.",
				furigana: "六時[ろくじ]に**起[お]きる**。"
			}
		]
	},
	{
		word: "働く",
		word_reading: "はたらく",
		word_meaning: "trabajar",
		word_furigana: "働[はたら]く",
		word_sentences: [
			{
				sentence: "会社で**働く**。",
				meaning: "Trabajo en la empresa.",
				furigana: "会社[かいしゃ]で**働[はたら]く**。"
			}
		]
	},
	{
		word: "休む",
		word_reading: "やすむ",
		word_meaning: "descansar",
		word_furigana: "休[やす]む",
		word_sentences: [
			{
				sentence: "少し**休む**。",
				meaning: "Descanso un poco.",
				furigana: "少[すこ]し**休[やす]む**。"
			}
		]
	},
	{
		word: "遊ぶ",
		word_reading: "あそぶ",
		word_meaning: "jugar",
		word_furigana: "遊[あそ]ぶ",
		word_sentences: [
			{
				sentence: "公園で**遊ぶ**。",
				meaning: "Juego en el parque.",
				furigana: "公園[こうえん]で**遊[あそ]ぶ**。"
			}
		]
	},
	{
		word: "教える",
		word_reading: "おしえる",
		word_meaning: "enseñar",
		word_furigana: "教[おし]える",
		word_sentences: [
			{
				sentence: "日本語を**教える**。",
				meaning: "Enseño japonés.",
				furigana: "日本語[にほんご]を**教[おし]える**。"
			}
		]
	},
	{
		word: "習う",
		word_reading: "ならう",
		word_meaning: "aprender (con alguien)",
		word_furigana: "習[なら]う",
		word_sentences: [
			{
				sentence: "英語を**習う**。",
				meaning: "Aprendo inglés.",
				furigana: "英語[えいご]を**習[なら]う**。"
			}
		]
	},
	{
		word: "覚える",
		word_reading: "おぼえる",
		word_meaning: "memorizar, recordar",
		word_furigana: "覚[おぼ]える",
		word_sentences: [
			{
				sentence: "単語を**覚える**。",
				meaning: "Memorizo palabras.",
				furigana: "単語[たんご]を**覚[おぼ]える**。"
			}
		]
	},
	{
		word: "忘れる",
		word_reading: "わすれる",
		word_meaning: "olvidar",
		word_furigana: "忘[わす]れる",
		word_sentences: [
			{
				sentence: "名前を**忘れる**。",
				meaning: "Olvido el nombre.",
				furigana: "名前[なまえ]を**忘[わす]れる**。"
			}
		]
	},
	{
		word: "分かる",
		word_reading: "わかる",
		word_meaning: "entender",
		word_furigana: "分[わ]かる",
		word_sentences: [
			{
				sentence: "意味が**分かる**。",
				meaning: "Entiendo el significado.",
				furigana: "意味[いみ]が**分[わ]かる**。"
			}
		]
	},
	{
		word: "知る",
		word_reading: "しる",
		word_meaning: "saber, conocer",
		word_furigana: "知[し]る",
		word_sentences: [
			{
				sentence: "答えを**知る**。",
				meaning: "Sé la respuesta.",
				furigana: "答[こた]えを**知[し]る**。"
			}
		]
	},
	{
		word: "思う",
		word_reading: "おもう",
		word_meaning: "pensar, creer",
		word_furigana: "思[おも]う",
		word_sentences: [
			{
				sentence: "そう**思う**。",
				meaning: "Pienso que sí.",
				furigana: "そう**思[おも]う**。"
			}
		]
	},
	{
		word: "考える",
		word_reading: "かんがえる",
		word_meaning: "pensar, considerar",
		word_furigana: "考[かんが]える",
		word_sentences: [
			{
				sentence: "未来を**考える**。",
				meaning: "Pienso en el futuro.",
				furigana: "未来[みらい]を**考[かんが]える**。"
			}
		]
	},
	{
		word: "好き",
		word_reading: "すき",
		word_meaning: "gustar",
		word_furigana: "好[す]き",
		word_sentences: [
			{
				sentence: "猫が**好き**です。",
				meaning: "Me gustan los gatos.",
				furigana: "猫[ねこ]が**好[す]き**です。"
			}
		]
	},
	{
		word: "嫌い",
		word_reading: "きらい",
		word_meaning: "no gustar, odiar",
		word_furigana: "嫌[きら]い",
		word_sentences: [
			{
				sentence: "虫が**嫌い**です。",
				meaning: "No me gustan los insectos.",
				furigana: "虫[むし]が**嫌[きら]い**です。"
			}
		]
	},
	{
		word: "大きい",
		word_reading: "おおきい",
		word_meaning: "grande",
		word_furigana: "大[おお]きい",
		word_sentences: [
			{
				sentence: "家が**大きい**。",
				meaning: "La casa es grande.",
				furigana: "家[いえ]が**大[おお]きい**。"
			}
		]
	},
	{
		word: "小さい",
		word_reading: "ちいさい",
		word_meaning: "pequeño",
		word_furigana: "小[ちい]さい",
		word_sentences: [
			{
				sentence: "猫が**小さい**。",
				meaning: "El gato es pequeño.",
				furigana: "猫[ねこ]が**小[ちい]さい**。"
			}
		]
	},
	{
		word: "高い",
		word_reading: "たかい",
		word_meaning: "alto, caro",
		word_furigana: "高[たか]い",
		word_sentences: [
			{
				sentence: "このかばんは**高い**。",
				meaning: "Este bolso es caro.",
				furigana: "このかばんは**高[たか]い**。"
			}
		]
	},
	{
		word: "安い",
		word_reading: "やすい",
		word_meaning: "barato",
		word_furigana: "安[やす]い",
		word_sentences: [
			{
				sentence: "この店は**安い**。",
				meaning: "Esta tienda es barata.",
				furigana: "この店[みせ]は**安[やす]い**。"
			}
		]
	},
	{
		word: "新しい",
		word_reading: "あたらしい",
		word_meaning: "nuevo",
		word_furigana: "新[あたら]しい",
		word_sentences: [
			{
				sentence: "**新しい**靴を買う。",
				meaning: "Compro zapatos nuevos.",
				furigana: "**新[あたら]しい**靴[くつ]を買[か]う。"
			}
		]
	},
	{
		word: "古い",
		word_reading: "ふるい",
		word_meaning: "viejo",
		word_furigana: "古[ふる]い",
		word_sentences: [
			{
				sentence: "**古い**本を読む。",
				meaning: "Leo un libro viejo.",
				furigana: "**古[ふる]い**本[ほん]を読[よ]む。"
			}
		]
	},
	{
		word: "面白い",
		word_reading: "おもしろい",
		word_meaning: "interesante, divertido",
		word_furigana: "面白[おもしろ]い",
		word_sentences: [
			{
				sentence: "この映画は**面白い**。",
				meaning: "Esta película es interesante.",
				furigana: "この映画[えいが]は**面白[おもしろ]い**。"
			}
		]
	},
	{
		word: "つまらない",
		word_reading: "つまらない",
		word_meaning: "aburrido",
		word_furigana: "つまらない",
		word_sentences: [
			{
				sentence: "この授業は**つまらない**。",
				meaning: "Esta clase es aburrida.",
				furigana: "この授業[じゅぎょう]は**つまらない**。"
			}
		]
	},
	{
		word: "忙しい",
		word_reading: "いそがしい",
		word_meaning: "ocupado",
		word_furigana: "忙[いそが]しい",
		word_sentences: [
			{
				sentence: "毎日**忙しい**。",
				meaning: "Estoy ocupado todos los días.",
				furigana: "毎日[まいにち]**忙[いそが]しい**。"
			}
		]
	},
	{
		word: "暇",
		word_reading: "ひま",
		word_meaning: "libre, desocupado",
		word_furigana: "暇[ひま]",
		word_sentences: [
			{
				sentence: "今日は**暇**です。",
				meaning: "Hoy estoy libre.",
				furigana: "今日[きょう]は**暇[ひま]**です。"
			}
		]
	},
	{
		word: "元気",
		word_reading: "げんき",
		word_meaning: "energético, con buena salud",
		word_furigana: "元気[げんき]",
		word_sentences: [
			{
				sentence: "今日も**元気**です。",
				meaning: "Hoy también estoy bien.",
				furigana: "今日[きょう]も**元気[げんき]**です。"
			}
		]
	},
	{
		word: "病気",
		word_reading: "びょうき",
		word_meaning: "enfermedad",
		word_furigana: "病気[びょうき]",
		word_sentences: [
			{
				sentence: "**病気**になる。",
				meaning: "Me enfermo.",
				furigana: "**病気[びょうき]**になる。"
			}
		]
	},
	{
		word: "上手",
		word_reading: "じょうず",
		word_meaning: "hábil, bueno en algo",
		word_furigana: "上手[じょうず]",
		word_sentences: [
			{
				sentence: "料理が**上手**です。",
				meaning: "Soy bueno cocinando.",
				furigana: "料理[りょうり]が**上手[じょうず]**です。"
			}
		]
	},
	{
		word: "下手",
		word_reading: "へた",
		word_meaning: "torpe, malo en algo",
		word_furigana: "下手[へた]",
		word_sentences: [
			{
				sentence: "歌が**下手**です。",
				meaning: "Soy malo cantando.",
				furigana: "歌[うた]が**下手[へた]**です。"
			}
		]
	},
	{
		word: "静か",
		word_reading: "しずか",
		word_meaning: "tranquilo, silencioso",
		word_furigana: "静[しず]か",
		word_sentences: [
			{
				sentence: "図書館は**静か**です。",
				meaning: "La biblioteca es tranquila.",
				furigana: "図書館[としょかん]は**静[しず]か**です。"
			}
		]
	},
	{
		word: "賑やか",
		word_reading: "にぎやか",
		word_meaning: "animado, bullicioso",
		word_furigana: "賑[にぎ]やか",
		word_sentences: [
			{
				sentence: "この町は**賑やか**です。",
				meaning: "Esta ciudad es animada.",
				furigana: "この町[まち]は**賑[にぎ]やか**です。"
			}
		]
	},
	{
		word: "便利",
		word_reading: "べんり",
		word_meaning: "conveniente",
		word_furigana: "便利[べんり]",
		word_sentences: [
			{
				sentence: "このアプリは**便利**です。",
				meaning: "Esta aplicación es conveniente.",
				furigana: "このアプリは**便利[べんり]**です。"
			}
		]
	},
	{
		word: "不便",
		word_reading: "ふべん",
		word_meaning: "inconveniente",
		word_furigana: "不便[ふべん]",
		word_sentences: [
			{
				sentence: "ここは交通が**不便**です。",
				meaning: "Aquí el transporte es inconveniente.",
				furigana: "ここは交通[こうつう]が**不便[ふべん]**です。"
			}
		]
	},
	{
		word: "簡単",
		word_reading: "かんたん",
		word_meaning: "fácil, sencillo",
		word_furigana: "簡単[かんたん]",
		word_sentences: [
			{
				sentence: "この問題は**簡単**です。",
				meaning: "Este problema es fácil.",
				furigana: "この問題[もんだい]は**簡単[かんたん]**です。"
			}
		]
	},
	{
		word: "難しい",
		word_reading: "むずかしい",
		word_meaning: "difícil",
		word_furigana: "難[むずか]しい",
		word_sentences: [
			{
				sentence: "日本語は**難しい**。",
				meaning: "El japonés es difícil.",
				furigana: "日本語[にほんご]は**難[むずか]しい**。"
			}
		]
	},
	{
		word: "大切",
		word_reading: "たいせつ",
		word_meaning: "importante",
		word_furigana: "大切[たいせつ]",
		word_sentences: [
			{
				sentence: "家族は**大切**です。",
				meaning: "La familia es importante.",
				furigana: "家族[かぞく]は**大切[たいせつ]**です。"
			}
		]
	},
	{
		word: "大丈夫",
		word_reading: "だいじょうぶ",
		word_meaning: "está bien, no hay problema",
		word_furigana: "大丈夫[だいじょうぶ]",
		word_sentences: [
			{
				sentence: "**大丈夫**ですか。",
				meaning: "¿Estás bien?",
				furigana: "**大丈夫[だいじょうぶ]**ですか。"
			}
		]
	},
	{
		word: "危ない",
		word_reading: "あぶない",
		word_meaning: "peligroso",
		word_furigana: "危[あぶ]ない",
		word_sentences: [
			{
				sentence: "この道は**危ない**。",
				meaning: "Este camino es peligroso.",
				furigana: "この道[みち]は**危[あぶ]ない**。"
			}
		]
	},
	{
		word: "天気",
		word_reading: "てんき",
		word_meaning: "clima",
		word_furigana: "天気[てんき]",
		word_sentences: [
			{
				sentence: "今日の**天気**はいいです。",
				meaning: "El clima de hoy es bueno.",
				furigana: "今日[きょう]の**天気[てんき]**はいいです。"
			}
		]
	},
	{
		word: "雨",
		word_reading: "あめ",
		word_meaning: "lluvia",
		word_furigana: "雨[あめ]",
		word_sentences: [
			{
				sentence: "今日は**雨**です。",
				meaning: "Hoy llueve.",
				furigana: "今日[きょう]は**雨[あめ]**です。"
			}
		]
	},
	{
		word: "雪",
		word_reading: "ゆき",
		word_meaning: "nieve",
		word_furigana: "雪[ゆき]",
		word_sentences: [
			{
				sentence: "冬に**雪**が降る。",
				meaning: "En invierno cae nieve.",
				furigana: "冬[ふゆ]に**雪[ゆき]**が降[ふ]る。"
			}
		]
	},
	{
		word: "風",
		word_reading: "かぜ",
		word_meaning: "viento",
		word_furigana: "風[かぜ]",
		word_sentences: [
			{
				sentence: "強い**風**が吹く。",
				meaning: "Sopla un viento fuerte.",
				furigana: "強[つよ]い**風[かぜ]**が吹[ふ]く。"
			}
		]
	},
	{
		word: "晴れ",
		word_reading: "はれ",
		word_meaning: "despejado",
		word_furigana: "晴[は]れ",
		word_sentences: [
			{
				sentence: "今日は**晴れ**です。",
				meaning: "Hoy está despejado.",
				furigana: "今日[きょう]は**晴[は]れ**です。"
			}
		]
	},
	{
		word: "曇り",
		word_reading: "くもり",
		word_meaning: "nublado",
		word_furigana: "曇[くも]り",
		word_sentences: [
			{
				sentence: "明日は**曇り**です。",
				meaning: "Mañana estará nublado.",
				furigana: "明日[あした]は**曇[くも]り**です。"
			}
		]
	},
	{
		word: "朝",
		word_reading: "あさ",
		word_meaning: "mañana",
		word_furigana: "朝[あさ]",
		word_sentences: [
			{
				sentence: "**朝**ご飯を食べる。",
				meaning: "Como el desayuno.",
				furigana: "**朝[あさ]**ご飯[はん]を食[た]べる。"
			}
		]
	},
	{
		word: "昼",
		word_reading: "ひる",
		word_meaning: "mediodía",
		word_furigana: "昼[ひる]",
		word_sentences: [
			{
				sentence: "**昼**ご飯を食べる。",
				meaning: "Como el almuerzo.",
				furigana: "**昼[ひる]**ご飯[はん]を食[た]べる。"
			}
		]
	},
	{
		word: "夜",
		word_reading: "よる",
		word_meaning: "noche",
		word_furigana: "夜[よる]",
		word_sentences: [
			{
				sentence: "**夜**は静かです。",
				meaning: "La noche es tranquila.",
				furigana: "**夜[よる]**は静[しず]かです。"
			}
		]
	},
	{
		word: "今日",
		word_reading: "きょう",
		word_meaning: "hoy",
		word_furigana: "今日[きょう]",
		word_sentences: [
			{
				sentence: "**今日**は暑いです。",
				meaning: "Hoy hace calor.",
				furigana: "**今日[きょう]**は暑[あつ]いです。"
			}
		]
	},
	{
		word: "明日",
		word_reading: "あした",
		word_meaning: "mañana (día)",
		word_furigana: "明日[あした]",
		word_sentences: [
			{
				sentence: "**明日**は休みです。",
				meaning: "Mañana es día libre.",
				furigana: "**明日[あした]**は休[やす]みです。"
			}
		]
	},
	{
		word: "昨日",
		word_reading: "きのう",
		word_meaning: "ayer",
		word_furigana: "昨日[きのう]",
		word_sentences: [
			{
				sentence: "**昨日**は忙しかったです。",
				meaning: "Ayer estuve ocupado.",
				furigana: "**昨日[きのう]**は忙[いそが]しかったです。"
			}
		]
	},
	{
		word: "今",
		word_reading: "いま",
		word_meaning: "ahora",
		word_furigana: "今[いま]",
		word_sentences: [
			{
				sentence: "**今**、何時ですか。",
				meaning: "¿Qué hora es ahora?",
				furigana: "**今[いま]**、何時[なんじ]ですか。"
			}
		]
	},
	{
		word: "前",
		word_reading: "まえ",
		word_meaning: "antes, delante",
		word_furigana: "前[まえ]",
		word_sentences: [
			{
				sentence: "駅の**前**にある。",
				meaning: "Está delante de la estación.",
				furigana: "駅[えき]の**前[まえ]**にある。"
			}
		]
	},
	{
		word: "学校",
		word_reading: "がっこう",
		word_meaning: "escuela",
		word_furigana: "学校[がっこう]",
		word_sentences: [
			{
				sentence: "**学校**へ行く。",
				meaning: "Voy a la escuela.",
				furigana: "**学校[がっこう]**へ行[い]く。"
			}
		]
	},
	{
		word: "会社",
		word_reading: "かいしゃ",
		word_meaning: "empresa",
		word_furigana: "会社[かいしゃ]",
		word_sentences: [
			{
				sentence: "**会社**で働く。",
				meaning: "Trabajo en la empresa.",
				furigana: "**会社[かいしゃ]**で働[はたら]く。"
			}
		]
	},
	{
		word: "病院",
		word_reading: "びょういん",
		word_meaning: "hospital",
		word_furigana: "病院[びょういん]",
		word_sentences: [
			{
				sentence: "**病院**へ行く。",
				meaning: "Voy al hospital.",
				furigana: "**病院[びょういん]**へ行[い]く。"
			}
		]
	},
	{
		word: "銀行",
		word_reading: "ぎんこう",
		word_meaning: "banco",
		word_furigana: "銀行[ぎんこう]",
		word_sentences: [
			{
				sentence: "**銀行**でお金を下ろす。",
				meaning: "Retiro dinero en el banco.",
				furigana: "**銀行[ぎんこう]**でお金[かね]を下[お]ろす。"
			}
		]
	},
	{
		word: "駅",
		word_reading: "えき",
		word_meaning: "estación",
		word_furigana: "駅[えき]",
		word_sentences: [
			{
				sentence: "**駅**まで歩く。",
				meaning: "Camino hasta la estación.",
				furigana: "**駅[えき]**まで歩[ある]く。"
			}
		]
	},
	{
		word: "図書館",
		word_reading: "としょかん",
		word_meaning: "biblioteca",
		word_furigana: "図書館[としょかん]",
		word_sentences: [
			{
				sentence: "**図書館**で勉強する。",
				meaning: "Estudio en la biblioteca.",
				furigana: "**図書館[としょかん]**で勉強[べんきょう]する。"
			}
		]
	},
	{
		word: "公園",
		word_reading: "こうえん",
		word_meaning: "parque",
		word_furigana: "公園[こうえん]",
		word_sentences: [
			{
				sentence: "**公園**で遊ぶ。",
				meaning: "Juego en el parque.",
				furigana: "**公園[こうえん]**で遊[あそ]ぶ。"
			}
		]
	},
	{
		word: "店",
		word_reading: "みせ",
		word_meaning: "tienda",
		word_furigana: "店[みせ]",
		word_sentences: [
			{
				sentence: "あの**店**は安い。",
				meaning: "Aquella tienda es barata.",
				furigana: "あの**店[みせ]**は安[やす]い。"
			}
		]
	},
	{
		word: "家",
		word_reading: "いえ",
		word_meaning: "casa",
		word_furigana: "家[いえ]",
		word_sentences: [
			{
				sentence: "**家**に帰る。",
				meaning: "Vuelvo a casa.",
				furigana: "**家[いえ]**に帰[かえ]る。"
			}
		]
	},
	{
		word: "部屋",
		word_reading: "へや",
		word_meaning: "habitación",
		word_furigana: "部屋[へや]",
		word_sentences: [
			{
				sentence: "**部屋**を掃除する。",
				meaning: "Limpio la habitación.",
				furigana: "**部屋[へや]**を掃除[そうじ]する。"
			}
		]
	},
	{
		word: "机",
		word_reading: "つくえ",
		word_meaning: "escritorio",
		word_furigana: "机[つくえ]",
		word_sentences: [
			{
				sentence: "**机**の上に本がある。",
				meaning: "Hay un libro sobre el escritorio.",
				furigana: "**机[つくえ]**の上[うえ]に本[ほん]がある。"
			}
		]
	},
	{
		word: "窓",
		word_reading: "まど",
		word_meaning: "ventana",
		word_furigana: "窓[まど]",
		word_sentences: [
			{
				sentence: "**窓**を開ける。",
				meaning: "Abro la ventana.",
				furigana: "**窓[まど]**を開[あ]ける。"
			}
		]
	},
	{
		word: "本",
		word_reading: "ほん",
		word_meaning: "libro",
		word_furigana: "本[ほん]",
		word_sentences: [
			{
				sentence: "**本**を読む。",
				meaning: "Leo un libro.",
				furigana: "**本[ほん]**を読[よ]む。"
			}
		]
	},
	{
		word: "新聞",
		word_reading: "しんぶん",
		word_meaning: "periódico",
		word_furigana: "新聞[しんぶん]",
		word_sentences: [
			{
				sentence: "**新聞**を読む。",
				meaning: "Leo el periódico.",
				furigana: "**新聞[しんぶん]**を読[よ]む。"
			}
		]
	},
	{
		word: "手紙",
		word_reading: "てがみ",
		word_meaning: "carta",
		word_furigana: "手紙[てがみ]",
		word_sentences: [
			{
				sentence: "**手紙**を書く。",
				meaning: "Escribo una carta.",
				furigana: "**手紙[てがみ]**を書[か]く。"
			}
		]
	},
	{
		word: "電話",
		word_reading: "でんわ",
		word_meaning: "teléfono",
		word_furigana: "電話[でんわ]",
		word_sentences: [
			{
				sentence: "**電話**をかける。",
				meaning: "Hago una llamada.",
				furigana: "**電話[でんわ]**をかける。"
			}
		]
	},
	{
		word: "写真",
		word_reading: "しゃしん",
		word_meaning: "foto",
		word_furigana: "写真[しゃしん]",
		word_sentences: [
			{
				sentence: "**写真**を撮る。",
				meaning: "Tomo una foto.",
				furigana: "**写真[しゃしん]**を撮[と]る。"
			}
		]
	},
	{
		word: "傘",
		word_reading: "かさ",
		word_meaning: "paraguas",
		word_furigana: "傘[かさ]",
		word_sentences: [
			{
				sentence: "**傘**を持っていく。",
				meaning: "Llevo un paraguas.",
				furigana: "**傘[かさ]**を持[も]っていく。"
			}
		]
	},
	{
		word: "靴",
		word_reading: "くつ",
		word_meaning: "zapatos",
		word_furigana: "靴[くつ]",
		word_sentences: [
			{
				sentence: "**靴**を履く。",
				meaning: "Me pongo los zapatos.",
				furigana: "**靴[くつ]**を履[は]く。"
			}
		]
	},
	{
		word: "財布",
		word_reading: "さいふ",
		word_meaning: "billetera",
		word_furigana: "財布[さいふ]",
		word_sentences: [
			{
				sentence: "**財布**を忘れる。",
				meaning: "Olvido la billetera.",
				furigana: "**財布[さいふ]**を忘[わす]れる。"
			}
		]
	},
	{
		word: "時計",
		word_reading: "とけい",
		word_meaning: "reloj",
		word_furigana: "時計[とけい]",
		word_sentences: [
			{
				sentence: "**時計**を見る。",
				meaning: "Miro el reloj.",
				furigana: "**時計[とけい]**を見[み]る。"
			}
		]
	},
	{
		word: "車",
		word_reading: "くるま",
		word_meaning: "auto",
		word_furigana: "車[くるま]",
		word_sentences: [
			{
				sentence: "**車**で行く。",
				meaning: "Voy en auto.",
				furigana: "**車[くるま]**で行[い]く。"
			}
		]
	},
	{
		word: "自転車",
		word_reading: "じてんしゃ",
		word_meaning: "bicicleta",
		word_furigana: "自転車[じてんしゃ]",
		word_sentences: [
			{
				sentence: "**自転車**に乗る。",
				meaning: "Ando en bicicleta.",
				furigana: "**自転車[じてんしゃ]**に乗[の]る。"
			}
		]
	},
	{
		word: "電車",
		word_reading: "でんしゃ",
		word_meaning: "tren",
		word_furigana: "電車[でんしゃ]",
		word_sentences: [
			{
				sentence: "**電車**で行く。",
				meaning: "Voy en tren.",
				furigana: "**電車[でんしゃ]**で行[い]く。"
			}
		]
	},
	{
		word: "飛行機",
		word_reading: "ひこうき",
		word_meaning: "avión",
		word_furigana: "飛行機[ひこうき]",
		word_sentences: [
			{
				sentence: "**飛行機**に乗る。",
				meaning: "Subo al avión.",
				furigana: "**飛行機[ひこうき]**に乗[の]る。"
			}
		]
	},
	{
		word: "猫",
		word_reading: "ねこ",
		word_meaning: "gato",
		word_furigana: "猫[ねこ]",
		word_sentences: [
			{
				sentence: "**猫**が好きです。",
				meaning: "Me gustan los gatos.",
				furigana: "**猫[ねこ]**が好[す]きです。"
			}
		]
	},
	{
		word: "犬",
		word_reading: "いぬ",
		word_meaning: "perro",
		word_furigana: "犬[いぬ]",
		word_sentences: [
			{
				sentence: "**犬**を飼う。",
				meaning: "Tengo un perro (como mascota).",
				furigana: "**犬[いぬ]**を飼[か]う。"
			}
		]
	},
	{
		word: "花",
		word_reading: "はな",
		word_meaning: "flor",
		word_furigana: "花[はな]",
		word_sentences: [
			{
				sentence: "**花**が咲く。",
				meaning: "La flor florece.",
				furigana: "**花[はな]**が咲[さ]く。"
			}
		]
	}
];

async function seed() {
	if (vocabulary.length !== 100) {
		throw new Error(`Expected 100 vocabulary entries, got ${vocabulary.length}`);
	}

	const client = postgres(DATABASE_URL as string);
	const db = drizzle(client);

	try {
		await db.insert(notes).values(
			vocabulary.map((entry) => ({
				type: NoteType.Vocabulary,
				metadata: entry
			}))
		);
		console.log(`Seeded ${vocabulary.length} vocabulary notes.`);
	} finally {
		await client.end();
	}
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
