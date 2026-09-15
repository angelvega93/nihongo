import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray, sql } from 'drizzle-orm';
import {
	courseUnits,
	courses,
	lessonNotes,
	lessons,
	quizOptions,
	quizQuestions
} from './course.schema.ts';
import { notes } from './fsrs.schema.ts';
import { CourseLevel, type LessonContentBlock } from '../../types/course.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

/** A quiz question in the seed catalog. The first option is the correct one. */
type SeedQuestion = {
	prompt: string;
	options: string[];
};

/**
 * A lesson inside a GENKI unit. `words` links existing vocabulary notes (cards);
 * `content` teaches the section; `quiz` adds a small comprehension check.
 */
type SeedLesson = {
	title: string;
	description: string;
	words?: string[];
	content?: LessonContentBlock[];
	quiz?: SeedQuestion[];
};

/** A GENKI lesson (第N課) becomes a unit in the course. */
type SeedUnit = {
	title: string;
	description: string;
	lessons: SeedLesson[];
};

const course: {
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	glyph: string;
	level: CourseLevel;
	units: SeedUnit[];
} = {
	slug: 'genki-1',
	title: 'GENKI I',
	subtitle: 'Curso integrado de japonés básico (Lecciones 1–12)',
	description:
		'Ruta basada en GENKI: Curso integrado de japonés básico I (3.ª edición). Cada unidad corresponde a una lección del libro y agrupa el diálogo, el vocabulario, la gramática y las notas culturales. Al terminar el volumen alcanzarás un nivel equivalente al N5 del JLPT.',
	glyph: '元',
	level: CourseLevel.N5,
	units: [
		{
			title: '第1課 あたらしいともだち — Nuevos amigos',
			description: 'Presentarse, preguntar nombres, especialidades y la hora.',
			lessons: [
				{
					title: 'Diálogo: presentaciones',
					description: 'Mary conoce a Takeshi en la orientación escolar.',
					content: [
						{ type: 'heading', text: 'En la orientación' },
						{
							type: 'example',
							japanese: 'こんにちは。きむらたけしです。',
							furigana: 'こんにちは。きむらたけしです。',
							meaning: 'Hola. Soy Takeshi Kimura.'
						},
						{
							type: 'example',
							japanese: 'メアリー・ハートです。あのう、りゅうがくせいですか。',
							furigana: 'メアリー・ハートです。あのう、りゅうがくせいですか。',
							meaning: 'Soy Mary Hart. Um... ¿eres un estudiante extranjero?'
						},
						{
							type: 'example',
							japanese: 'いいえ、にほんじんです。',
							furigana: 'いいえ、にほんじんです。',
							meaning: 'No, yo soy japonés.'
						},
						{
							type: 'example',
							japanese: 'そうですか。なんねんせいですか。',
							furigana: 'そうですか。なんねんせいですか。',
							meaning: 'Ya veo. ¿En qué año de universidad estás?'
						},
						{
							type: 'example',
							japanese: 'よねんせいです。',
							furigana: 'よねんせいです。',
							meaning: 'Soy estudiante de cuarto año.'
						},
						{ type: 'heading', text: 'Presentación de Mary' },
						{
							type: 'example',
							japanese: 'はじめまして。メアリー・ハートです。',
							furigana: 'はじめまして。メアリー・ハートです。',
							meaning: 'Mucho gusto. Soy Mary Hart.'
						},
						{
							type: 'example',
							japanese: 'アリゾナだいがくのがくせいです。にねんせいです。',
							furigana: 'アリゾナだいがくのがくせいです。にねんせいです。',
							meaning: 'Soy estudiante de la Universidad de Arizona. Estoy en segundo año.'
						},
						{
							type: 'example',
							japanese: 'せんこうはにほんごです。じゅうきゅうさいです。',
							furigana: 'せんこうはにほんごです。じゅうきゅうさいです。',
							meaning: 'Mi especialidad es el japonés. Tengo 19 años.'
						},
						{
							type: 'example',
							japanese: 'よろしくおねがいします。',
							furigana: 'よろしくおねがいします。',
							meaning: 'Encantada de conocerlos.'
						}
					]
				},
				{
					title: 'Gramática: XはYです',
					description: 'Oraciones con です, preguntas con か y la partícula の.',
					content: [
						{ type: 'heading', text: '1. XはYです' },
						{
							type: 'paragraph',
							text: 'Las oraciones «X es Y» se forman con el sustantivo apropiado y です. El sujeto suele omitirse cuando el contexto lo deja claro.'
						},
						{
							type: 'example',
							japanese: 'がくせいです。',
							furigana: 'がくせいです。',
							meaning: '(Yo) soy estudiante.'
						},
						{
							type: 'example',
							japanese: 'せんこうはにほんごです。',
							furigana: 'せんこうはにほんごです。',
							meaning: 'Mi especialidad es el japonés.'
						},
						{
							type: 'note',
							text: 'La partícula は se escribe con el hiragana は pero se pronuncia «wa». Marca el tema de la oración.'
						},
						{ type: 'heading', text: '2. Oraciones interrogativas' },
						{
							type: 'paragraph',
							text: 'Basta con añadir か al final de una afirmación para convertirla en pregunta.'
						},
						{
							type: 'example',
							japanese: 'りゅうがくせいですか。',
							furigana: 'りゅうがくせいですか。',
							meaning: '¿(Eres) un estudiante extranjero?'
						},
						{
							type: 'example',
							japanese: 'いまなんじですか。',
							furigana: 'いまなんじですか。',
							meaning: '¿Qué hora es ahora?'
						},
						{ type: 'heading', text: '3. Sustantivo₁ の Sustantivo₂' },
						{
							type: 'paragraph',
							text: 'La partícula の conecta dos sustantivos. El segundo es la idea principal y el primero la especifica.'
						},
						{
							type: 'example',
							japanese: 'たけしさんのでんわばんごう',
							furigana: 'たけしさんのでんわばんごう',
							meaning: 'el número de teléfono de Takeshi'
						},
						{
							type: 'example',
							japanese: 'にほんごのがくせい',
							furigana: 'にほんごのがくせい',
							meaning: 'un estudiante de japonés'
						}
					],
					quiz: [
						{
							prompt: '¿Cómo se convierte una afirmación en pregunta?',
							options: [
								'Añadiendo か al final',
								'Añadiendo ね al final',
								'Cambiando です por でした'
							]
						},
						{
							prompt: '¿Qué significa にほんごのがくせい?',
							options: ['Estudiante de japonés', 'Profesor de japonés', 'Universidad de Japón']
						},
						{
							prompt: '¿Cómo se pronuncia la partícula は?',
							options: ['wa', 'ha', 'ba']
						}
					]
				},
				{
					title: 'Notas culturales: los nombres japoneses',
					description: 'Orden del nombre, kanji y títulos de tratamiento.',
					content: [
						{ type: 'heading', text: 'にほんじんのなまえ' },
						{
							type: 'paragraph',
							text: 'Al dar su nombre, los japoneses mencionan primero el apellido y después el nombre. Al presentarse suelen decir solo su apellido.'
						},
						{
							type: 'paragraph',
							text: 'La mayoría de los nombres se escriben en kanji. Como muchos kanji comparten lectura, un mismo nombre puede escribirse con caracteres distintos.'
						},
						{
							type: 'note',
							text: 'さん se añade después del nombre como título genérico. Nunca se usa para uno mismo. A los profesores y profesionales se les llama せんせい.'
						}
					]
				}
			]
		},
		{
			title: '第2課 かいもの — Las compras',
			description: 'Preguntar precios, hacer la compra y pedir en un restaurante.',
			lessons: [
				{
					title: 'Diálogo: en el mercadillo',
					description: 'Mary pregunta precios y encuentra una billetera.',
					content: [
						{
							type: 'example',
							japanese: 'すみません。これはいくらですか。',
							furigana: 'すみません。これはいくらですか。',
							meaning: 'Disculpe. ¿Cuánto cuesta esto?'
						},
						{
							type: 'example',
							japanese: 'それはさんぜんえんです。',
							furigana: 'それはさんぜんえんです。',
							meaning: 'Eso cuesta 3000 yenes.'
						},
						{
							type: 'example',
							japanese: 'たかいですね。じゃあ、あのとけいはいくらですか。',
							furigana: 'たかいですね。じゃあ、あのとけいはいくらですか。',
							meaning: 'Es caro. Entonces, ¿cuánto cuesta ese reloj?'
						},
						{
							type: 'example',
							japanese: 'じゃあ、そのとけいをください。',
							furigana: 'じゃあ、そのとけいをください。',
							meaning: 'Entonces, me llevaré ese reloj.'
						},
						{
							type: 'example',
							japanese: 'これはだれのさいふですか。',
							furigana: 'これはだれのさいふですか。',
							meaning: '¿De quién es esta billetera?'
						}
					]
				},
				{
					title: 'Gramática: これ/それ/あれ y じゃないです',
					description: 'Demostrativos, lugar, pertenencia, も y negación.',
					content: [
						{ type: 'heading', text: '1. これ / それ / あれ / どれ' },
						{
							type: 'paragraph',
							text: 'これ se refiere a algo cerca del hablante, それ a algo cerca del oyente y あれ a algo lejos de ambos. どれ significa «cuál».'
						},
						{
							type: 'example',
							japanese: 'これはいくらですか。',
							furigana: 'これはいくらですか。',
							meaning: '¿Cuánto cuesta esto?'
						},
						{ type: 'heading', text: '2. この / その / あの / どの + Sustantivo' },
						{
							type: 'paragraph',
							text: 'La serie の va seguida de un sustantivo: このとけい (este reloj). A diferencia de la serie れ, puede usarse para personas.'
						},
						{
							type: 'example',
							japanese: 'このとけいはいくらですか。',
							furigana: 'このとけいはいくらですか。',
							meaning: '¿Cuánto cuesta este reloj?'
						},
						{ type: 'heading', text: '3. ここ / そこ / あそこ / どこ' },
						{
							type: 'example',
							japanese: 'すみません。ゆうびんきょくはどこですか。',
							furigana: 'すみません。ゆうびんきょくはどこですか。',
							meaning: 'Disculpe. ¿Dónde está la oficina de correos?'
						},
						{ type: 'heading', text: '4. だれの Sustantivo' },
						{
							type: 'example',
							japanese: 'これはだれのかばんですか。',
							furigana: 'これはだれのかばんですか。',
							meaning: '¿De quién es este bolso?'
						},
						{ type: 'heading', text: '5. Sustantivo も' },
						{
							type: 'paragraph',
							text: 'も significa «también» y sustituye a は. Se coloca justo después del elemento que comparte el atributo.'
						},
						{
							type: 'example',
							japanese: 'ゆいさんもにほんじんです。',
							furigana: 'ゆいさんもにほんじんです。',
							meaning: 'Yui también es japonesa.'
						},
						{ type: 'heading', text: '6. Sustantivo じゃないです' },
						{
							type: 'paragraph',
							text: 'Para negar «XはYです» se sustituye です por じゃないです. Las variantes じゃありません y ではありません son más formales.'
						},
						{
							type: 'example',
							japanese: 'やまださんはがくせいじゃないです。',
							furigana: 'やまださんはがくせいじゃないです。',
							meaning: 'El Sr. Yamada no es estudiante.'
						},
						{ type: 'heading', text: '7. 〜ね / 〜よ' },
						{
							type: 'paragraph',
							text: 'ね busca la confirmación del oyente («¿verdad?»). よ afirma con seguridad lo que se dice («te digo»).'
						},
						{
							type: 'example',
							japanese: 'とんかつはさかなじゃないですよ。',
							furigana: 'とんかつはさかなじゃないですよ。',
							meaning: 'El tonkatsu no es pescado (te digo).'
						}
					],
					quiz: [
						{
							prompt: '¿Qué demostrativo se usa para algo cerca del oyente?',
							options: ['それ', 'これ', 'あれ']
						},
						{
							prompt: '¿Qué significa も?',
							options: ['También', 'No es', 'Cuál']
						},
						{
							prompt: '¿Cuál es la forma negativa de がくせいです?',
							options: ['がくせいじゃないです', 'がくせいでした', 'がくせいですか']
						}
					]
				},
				{
					title: 'Notas culturales: la moneda japonesa',
					description: 'El yen, billetes y monedas en circulación.',
					content: [
						{ type: 'heading', text: 'にほんのおかね' },
						{
							type: 'paragraph',
							text: 'La moneda oficial es el yen, que en japonés se pronuncia «en». Los billetes y monedas tienen tamaños diferentes para distinguirlos al tacto.'
						},
						{
							type: 'note',
							text: 'Aunque las tarjetas y los pagos móviles están extendidos, algunos comercios pequeños no los aceptan, así que conviene llevar efectivo.'
						}
					]
				}
			]
		},
		{
			title: '第3課 デートの約束 — Concertar una cita',
			description: 'Hablar de actividades diarias e invitar a alguien.',
			lessons: [
				{
					title: 'Diálogo: una invitación',
					description: 'Takeshi invita a Mary al cine.',
					content: [
						{
							type: 'example',
							japanese: 'メアリーさん、しゅうまつはたいていなにをしますか。',
							furigana: 'メアリーさん、しゅうまつはたいていなにをしますか。',
							meaning: 'Mary, ¿qué sueles hacer los fines de semana?'
						},
						{
							type: 'example',
							japanese: 'たいていうちでべんきょうします。でも、ときどきえいがをみます。',
							furigana: 'たいていうちでべんきょうします。でも、ときどきえいがをみます。',
							meaning: 'Suelo estudiar en casa. Pero a veces veo películas.'
						},
						{
							type: 'example',
							japanese: 'じゃあ、どようびにえいがをみませんか。',
							furigana: 'じゃあ、どようびにえいがをみませんか。',
							meaning: 'Entonces, ¿te gustaría ver una película el sábado?'
						},
						{
							type: 'example',
							japanese: 'どようびはちょっと……。',
							furigana: 'どようびはちょっと……。',
							meaning: 'El sábado no me viene bien...'
						},
						{
							type: 'example',
							japanese: 'じゃあ、にちようびはどうですか。',
							furigana: 'じゃあ、にちようびはどうですか。',
							meaning: 'Entonces, ¿qué tal el domingo?'
						}
					]
				},
				{
					title: 'Vocabulario: verbos de acción',
					description: 'Los verbos básicos del día a día.',
					words: ['行く', '来る', '飲む', '読む', '話す', '聞く', '見る', '食べる', '買う'],
					quiz: [
						{
							prompt: '¿Qué significa 飲む?',
							options: ['Beber', 'Comer', 'Leer']
						},
						{
							prompt: '¿Qué significa 読む?',
							options: ['Leer', 'Escribir', 'Escuchar']
						},
						{
							prompt: '¿Qué significa 買う?',
							options: ['Comprar', 'Vender', 'Usar']
						}
					]
				},
				{
					title: 'Gramática: conjugación y partículas',
					description: 'Grupos de verbos, presente, partículas y frecuencia.',
					content: [
						{ type: 'heading', text: '1. Conjugaciones verbales' },
						{
							type: 'paragraph',
							text: 'Los verbos se clasifican en tres grupos: verbos en -ru (terminan en eru/iru), verbos en -u y los irregulares する y くる.'
						},
						{
							type: 'example',
							japanese: 'たべる → たべます / たべません',
							furigana: 'たべる → たべます / たべません',
							meaning: 'comer → como / no como'
						},
						{
							type: 'example',
							japanese: 'のむ → のみます / のみません',
							furigana: 'のむ → のみます / のみません',
							meaning: 'beber → bebo / no bebo'
						},
						{ type: 'heading', text: '2. El «tiempo presente»' },
						{
							type: 'paragraph',
							text: 'El presente de los verbos de acción indica una acción habitual o una acción futura.'
						},
						{
							type: 'example',
							japanese: 'わたしはよくテレビをみます。',
							furigana: 'わたしはよくテレビをみます。',
							meaning: 'A menudo veo la televisión.'
						},
						{
							type: 'example',
							japanese: 'あしたきょうとにいきます。',
							furigana: 'あしたきょうとにいきます。',
							meaning: 'Mañana voy a Kioto.'
						},
						{ type: 'heading', text: '3. Partículas を / で / に / へ' },
						{
							type: 'paragraph',
							text: 'を marca el objeto directo, で el lugar de la acción, y に/へ el destino del movimiento. に también marca el tiempo.'
						},
						{
							type: 'example',
							japanese: 'としょかんでほんをよみます。',
							furigana: 'としょかんでほんをよみます。',
							meaning: 'Leo libros en la biblioteca.'
						},
						{
							type: 'example',
							japanese: 'にちようびにきょうとにいきます。',
							furigana: 'にちようびにきょうとにいきます。',
							meaning: 'Voy a Kioto el domingo.'
						},
						{ type: 'heading', text: '4. Referencias temporales' },
						{
							type: 'paragraph',
							text: 'Se usa に con días de la semana y horas concretas. No se usa con あした, まいにち ni いつ.'
						},
						{ type: 'heading', text: '5. 〜ませんか' },
						{
							type: 'paragraph',
							text: 'La forma negativa más か sirve para invitar. Su contraparte afirmativa ますか solo es una pregunta.'
						},
						{
							type: 'example',
							japanese: 'ひるごはんをたべませんか。',
							furigana: 'ひるごはんをたべませんか。',
							meaning: '¿Qué te parece si almorzamos juntos?'
						},
						{ type: 'heading', text: '6. Adverbios de frecuencia' },
						{
							type: 'paragraph',
							text: 'まいにち, よく y ときどき indican frecuencia. あまり y ぜんぜん anticipan una negación.'
						},
						{
							type: 'example',
							japanese: 'たけしさんはあまりべんきょうしません。',
							furigana: 'たけしさんはあまりべんきょうしません。',
							meaning: 'Takeshi no estudia mucho.'
						},
						{ type: 'heading', text: '7. Orden de las palabras' },
						{
							type: 'paragraph',
							text: 'El orden típico es tema, tiempo, lugar, objeto y verbo. El verbo va siempre al final.'
						},
						{ type: 'heading', text: '8. La partícula temática は' },
						{
							type: 'paragraph',
							text: 'は presenta el tema del enunciado. El tema no tiene por qué ser el sujeto gramatical.'
						},
						{
							type: 'example',
							japanese: 'ばんごはんは？',
							furigana: 'ばんごはんは？',
							meaning: '¿Y la cena?'
						}
					],
					quiz: [
						{
							prompt: '¿Cuál es la forma negativa de のみます?',
							options: ['のみません', 'のみました', 'のみませんでした']
						},
						{
							prompt: '¿Qué partícula marca el lugar de la acción?',
							options: ['で', 'に', 'を']
						},
						{
							prompt: '¿Qué adverbio anticipa una negación?',
							options: ['あまり', 'よく', 'ときどき']
						}
					]
				},
				{
					title: 'Notas culturales: las casas japonesas',
					description: 'Tatami, baños y el 玄関.',
					content: [
						{ type: 'heading', text: 'にほんのいえ' },
						{
							type: 'paragraph',
							text: 'Tradicionalmente las casas eran de madera, con suelo de tatami y puertas correderas. Hoy predominan las habitaciones de estilo occidental.'
						},
						{
							type: 'note',
							text: 'El げんかん es el espacio de la entrada donde se quitan los zapatos. El baño está separado del inodoro y se comparte el agua de la bañera tras lavarse el cuerpo.'
						}
					]
				}
			]
		},
		{
			title: '第4課 はじめてのデート — La primera cita',
			description: 'Describir ubicaciones y hablar del pasado.',
			lessons: [
				{
					title: 'Diálogo: la cita fallida',
					description: "Mary busca el McDonald's y luego cuenta su día.",
					content: [
						{
							type: 'example',
							japanese: 'すみません。マクドナルドはどこですか。',
							furigana: 'すみません。マクドナルドはどこですか。',
							meaning: "Disculpe. ¿Dónde está el McDonald's?"
						},
						{
							type: 'example',
							japanese: 'マクドナルドはあのホテルのまえですよ。',
							furigana: 'マクドナルドはあのホテルのまえですよ。',
							meaning: "El McDonald's está delante de aquel hotel."
						},
						{
							type: 'example',
							japanese: 'えいがはどうでしたか。',
							furigana: 'えいがはどうでしたか。',
							meaning: '¿Qué tal la película?'
						},
						{
							type: 'example',
							japanese: 'みませんでした。たけしさんはきませんでした。',
							furigana: 'みませんでした。たけしさんはきませんでした。',
							meaning: 'No la vi. Takeshi no llegó.'
						},
						{
							type: 'example',
							japanese: 'おてらでしゃしんをたくさんとりました。',
							furigana: 'おてらでしゃしんをたくさんとりました。',
							meaning: 'Tomé muchas fotos en el templo.'
						}
					]
				},
				{
					title: 'Vocabulario: lugares y objetos',
					description: 'Sustantivos de lugares, animales y cosas.',
					words: ['猫', '犬', '写真', '花', '公園', '病院', '本', '傘', '靴', '時計'],
					quiz: [
						{
							prompt: '¿Qué significa ねこ?',
							options: ['Gato', 'Perro', 'Flor']
						},
						{
							prompt: '¿Qué significa しゃしん?',
							options: ['Fotografía', 'Periódico', 'Carta']
						},
						{
							prompt: '¿Qué significa こうえん?',
							options: ['Parque', 'Hospital', 'Biblioteca']
						}
					]
				},
				{
					title: 'Gramática: existencia y pasado',
					description: 'あります/います, ubicación, pasado de です y de los verbos.',
					content: [
						{ type: 'heading', text: '1. Xがあります / います' },
						{
							type: 'paragraph',
							text: 'あります se usa para cosas y eventos; います para personas y animales. El lugar lleva に y lo presentado lleva が.'
						},
						{
							type: 'example',
							japanese: 'あそこにマクドナルドがあります。',
							furigana: 'あそこにマクドナルドがあります。',
							meaning: "Allí hay un McDonald's."
						},
						{
							type: 'example',
							japanese: 'あそこにりゅうがくせいがいます。',
							furigana: 'あそこにりゅうがくせいがいます。',
							meaning: 'Hay un estudiante extranjero allí.'
						},
						{ type: 'heading', text: '2. Describir dónde están las cosas' },
						{
							type: 'paragraph',
							text: 'Se usa «XはYの + palabra de posición + です»: みぎ, ひだり, まえ, うしろ, なか, うえ, した, ちかく, となり, あいだ.'
						},
						{
							type: 'example',
							japanese: 'ぎんこうはとしょかんのとなりです。',
							furigana: 'ぎんこうはとしょかんのとなりです。',
							meaning: 'El banco está al lado de la biblioteca.'
						},
						{
							type: 'example',
							japanese: 'かさはテーブルのしたです。',
							furigana: 'かさはテーブルのしたです。',
							meaning: 'El paraguas está debajo de la mesa.'
						},
						{ type: 'heading', text: '3. El pasado de です' },
						{
							type: 'paragraph',
							text: 'El pasado afirmativo es でした y el negativo じゃなかったです.'
						},
						{
							type: 'example',
							japanese: 'やましたせんせいはさくらだいがくのがくせいでした。',
							furigana: 'やましたせんせいはさくらだいがくのがくせいでした。',
							meaning: 'El Sr. Yamashita era estudiante de la Universidad Sakura.'
						},
						{ type: 'heading', text: '4. Tiempo pasado de los verbos' },
						{
							type: 'paragraph',
							text: 'El pasado afirmativo termina en ました y el negativo en ませんでした.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはくじごろうちにかえりました。',
							furigana: 'メアリーさんはくじごろうちにかえりました。',
							meaning: 'Mary volvió a casa sobre las nueve.'
						},
						{
							type: 'example',
							japanese: 'きのうにほんごをべんきょうしませんでした。',
							furigana: 'きのうにほんごをべんきょうしませんでした。',
							meaning: 'Ayer no estudié japonés.'
						},
						{ type: 'heading', text: '5. も' },
						{
							type: 'paragraph',
							text: 'も sustituye a は y を, y se añade a に y で (にも, でも).'
						},
						{
							type: 'example',
							japanese: 'おおさかにもいきました。',
							furigana: 'おおさかにもいきました。',
							meaning: 'También fui a Osaka.'
						},
						{ type: 'heading', text: '6. 〜時間' },
						{
							type: 'paragraph',
							text: 'La duración se expresa con un sustantivo sin partícula. ぐらい indica aproximación y 半 se añade tras 〜時間.'
						},
						{
							type: 'example',
							japanese: 'にほんごをさんじかんぐらいべんきょうしました。',
							furigana: 'にほんごをさんじかんぐらいべんきょうしました。',
							meaning: 'Estudié japonés durante unas tres horas.'
						},
						{ type: 'heading', text: '7. たくさん' },
						{
							type: 'paragraph',
							text: 'たくさん puede ir antes del sustantivo o después de la partícula を.'
						},
						{
							type: 'example',
							japanese: 'きょうとでしゃしんをたくさんとりました。',
							furigana: 'きょうとでしゃしんをたくさんとりました。',
							meaning: 'Tomé muchas fotos en Kioto.'
						},
						{ type: 'heading', text: '8. と' },
						{
							type: 'paragraph',
							text: 'と significa «junto con» e indica con quién se hace algo.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはソラさんとかんこくにいきます。',
							furigana: 'メアリーさんはソラさんとかんこくにいきます。',
							meaning: 'Mary irá a Corea con Sora.'
						}
					],
					quiz: [
						{
							prompt: '¿Qué verbo se usa para personas y animales?',
							options: ['います', 'あります', 'です']
						},
						{
							prompt: '¿Cuál es el pasado negativo de たべます?',
							options: ['たべませんでした', 'たべました', 'たべません']
						},
						{
							prompt: '¿Qué significa となり?',
							options: ['Junto a / al lado', 'Delante de', 'Debajo de']
						}
					]
				},
				{
					title: 'Notas culturales: los días festivos',
					description: 'Los festivos nacionales y la Semana Dorada.',
					content: [
						{ type: 'heading', text: 'にほんのしゅくじつ' },
						{
							type: 'paragraph',
							text: 'Japón tiene numerosos días festivos nacionales, como el Año Nuevo (1 de enero), el Día de la mayoría de edad y el Día del niño (5 de mayo).'
						},
						{
							type: 'note',
							text: 'El periodo entre el 29 de abril y el 5 de mayo concentra varios festivos y se llama ゴールデンウィーク (Semana Dorada).'
						}
					]
				}
			]
		},
		{
			title: '第5課 おきなわりょこう — Un viaje a Okinawa',
			description: 'Describir personas y cosas, y hablar de gustos.',
			lessons: [
				{
					title: 'Diálogo: en Okinawa',
					description: 'Robert y Ken hablan del mar y del surf.',
					content: [
						{
							type: 'example',
							japanese: 'いいてんきですね。',
							furigana: 'いいてんきですね。',
							meaning: 'Qué buen tiempo, ¿no?'
						},
						{
							type: 'example',
							japanese: 'そうですね。でも、ちょっとあついですね。',
							furigana: 'そうですね。でも、ちょっとあついですね。',
							meaning: 'Sí. Pero hace un poco de calor.'
						},
						{
							type: 'example',
							japanese: 'わあ、きれいなうみ！',
							furigana: 'わあ、きれいなうみ！',
							meaning: '¡Guau, qué lindo el mar!'
						},
						{
							type: 'example',
							japanese: 'ロバートさんはどんなスポーツがすきですか。',
							furigana: 'ロバートさんはどんなスポーツがすきですか。',
							meaning: '¿Qué tipo de deportes te gustan, Robert?'
						},
						{
							type: 'example',
							japanese: 'サーフィンがすきです。あしたいっしょにやりましょうか。',
							furigana: 'サーフィンがすきです。あしたいっしょにやりましょうか。',
							meaning: 'Me gusta el surf. ¿Surfeamos juntos mañana?'
						}
					]
				},
				{
					title: 'Vocabulario: adjetivos',
					description: 'Adjetivos en -い y en -な.',
					words: [
						'新しい',
						'古い',
						'忙しい',
						'大きい',
						'小さい',
						'面白い',
						'つまらない',
						'難しい',
						'好き',
						'嫌い',
						'元気',
						'静か',
						'賑やか',
						'暇'
					],
					quiz: [
						{
							prompt: '¿Qué significa あたらしい?',
							options: ['Nuevo', 'Viejo', 'Grande']
						},
						{
							prompt: '¿Qué significa いそがしい?',
							options: ['Ocupado', 'Tranquilo', 'Aburrido']
						},
						{
							prompt: '¿Qué significa すき?',
							options: ['Gustar', 'Disgustar', 'Odiar']
						}
					]
				},
				{
					title: 'Gramática: adjetivos y sugerencias',
					description: 'Presente, pasado, modificación y ましょう.',
					content: [
						{ type: 'heading', text: '1. Adjetivos (presente)' },
						{
							type: 'paragraph',
							text: 'Los adjetivos-い niegan cambiando la い final por くない. Los adjetivos-な funcionan como sustantivos: じゃないです.'
						},
						{
							type: 'example',
							japanese: 'さむいです / さむくないです',
							furigana: 'さむいです / さむくないです',
							meaning: 'Hace frío / No hace frío'
						},
						{
							type: 'example',
							japanese: 'げんきです / げんきじゃないです',
							furigana: 'げんきです / げんきじゃないです',
							meaning: 'Está sano / No está sano'
						},
						{
							type: 'note',
							text: 'いい es irregular: su forma negativa es よくないです.'
						},
						{ type: 'heading', text: '2. Adjetivos (pasado)' },
						{
							type: 'paragraph',
							text: 'Los adjetivos-い pasan a かったです. Los adjetivos-な usan でした.'
						},
						{
							type: 'example',
							japanese: 'さむかったです / さむくなかったです',
							furigana: 'さむかったです / さむくなかったです',
							meaning: 'Hacía frío / No hacía frío'
						},
						{
							type: 'example',
							japanese: 'げんきでした / げんきじゃなかったです',
							furigana: 'げんきでした / げんきじゃなかったです',
							meaning: 'Estaba sano / No estaba sano'
						},
						{ type: 'heading', text: '3. Adjetivos (modificación del sustantivo)' },
						{
							type: 'paragraph',
							text: 'El adjetivo-い se coloca directamente antes del sustantivo. El adjetivo-な recupera la な.'
						},
						{
							type: 'example',
							japanese: 'おもしろいえいが',
							furigana: 'おもしろいえいが',
							meaning: 'una película interesante'
						},
						{
							type: 'example',
							japanese: 'きれいなしゃしん',
							furigana: 'きれいなしゃしん',
							meaning: 'una bella foto'
						},
						{ type: 'heading', text: '4. 好き(な) / きらい(な)' },
						{
							type: 'paragraph',
							text: 'El objeto del gusto lleva が: «XはYがすきです». Las formas intensas son だいすき y だいきらい.'
						},
						{
							type: 'example',
							japanese: 'ロバートさんはにほんごのクラスがすきです。',
							furigana: 'ロバートさんはにほんごのクラスがすきです。',
							meaning: 'A Robert le gustan las clases de japonés.'
						},
						{ type: 'heading', text: '5. 〜ましょう / 〜ましょうか' },
						{
							type: 'paragraph',
							text: 'Se forma sustituyendo ます por ましょう o ましょうか para sugerir un plan.'
						},
						{
							type: 'example',
							japanese: 'いっしょにとしょかんでべんきょうしましょう。',
							furigana: 'いっしょにとしょかんでべんきょうしましょう。',
							meaning: 'Estudiemos juntos en la biblioteca.'
						},
						{ type: 'heading', text: '6. Contadores' },
						{
							type: 'paragraph',
							text: 'Cada tipo de objeto usa un contador distinto. 枚 cuenta objetos planos, como camisetas o papel.'
						},
						{
							type: 'example',
							japanese: 'Tシャツをさんまいください。',
							furigana: 'Tシャツをさんまいください。',
							meaning: 'Tres camisetas, por favor.'
						}
					],
					quiz: [
						{
							prompt: '¿Cuál es el pasado de さむいです?',
							options: ['さむかったです', 'さむいでした', 'さむでした']
						},
						{
							prompt: '¿Qué partícula marca el objeto del gusto?',
							options: ['が', 'を', 'に']
						},
						{
							prompt: '¿Qué significa いっしょに?',
							options: ['Juntos', 'Después', 'Mucho']
						}
					]
				},
				{
					title: 'Notas culturales: los festivales',
					description: 'Matsuri famosos de Japón.',
					content: [
						{ type: 'heading', text: 'にほんのまつり' },
						{
							type: 'paragraph',
							text: 'Japón tiene muchísimos festivales, desde los muy tradicionales hasta los más recientes. Cada región tiene los suyos.'
						},
						{
							type: 'note',
							text: 'Entre los más conocidos están el Festival de la nieve de Sapporo, el Gion de Kioto, el Nebuta de Aomori y el Tanabata de Sendai.'
						}
					]
				}
			]
		},
		{
			title: '第6課 ロバートさんのいちにち — Un día en la vida de Robert',
			description: 'Hacer peticiones, pedir permiso y dar razones.',
			lessons: [
				{
					title: 'Diálogo: en clase y en el autobús',
					description: 'Robert se duerme en clase y ayuda a una señora.',
					content: [
						{
							type: 'example',
							japanese: 'ロバートさん、つぎのページをよんでください。',
							furigana: 'ロバートさん、つぎのページをよんでください。',
							meaning: 'Robert, por favor, lee la siguiente página.'
						},
						{
							type: 'example',
							japanese: 'ロバートさん、おきてください。クラスでねてはいけませんよ。',
							furigana: 'ロバートさん、おきてください。クラスでねてはいけませんよ。',
							meaning: 'Robert, por favor, despierta. No se puede dormir en clase.'
						},
						{
							type: 'example',
							japanese: 'あとでソラさんのノートをかりてもいいですか。',
							furigana: 'あとでソラさんのノートをかりてもいいですか。',
							meaning: '¿Me prestas tu cuaderno más tarde, Sora?'
						},
						{
							type: 'example',
							japanese: 'きんようびにやすみましたからね。',
							furigana: 'きんようびにやすみましたからね。',
							meaning: 'Faltaste a clases el viernes pasado (por eso no lo sabías).'
						},
						{
							type: 'example',
							japanese: 'にもつをもちましょうか。',
							furigana: 'にもつをもちましょうか。',
							meaning: '¿Le sostengo la bolsa?'
						}
					]
				},
				{
					title: 'Vocabulario: objetos y verbos',
					description: 'Objetos de la vida diaria y verbos en forma -te.',
					words: ['遊ぶ', '座る', '立つ', '使う', '忘れる', '教える', '電話', '窓', '部屋', '電車'],
					quiz: [
						{
							prompt: '¿Qué significa つかう?',
							options: ['Usar', 'Olvidar', 'Devolver']
						},
						{
							prompt: '¿Qué significa わすれる?',
							options: ['Olvidar', 'Recordar', 'Enseñar']
						},
						{
							prompt: '¿Qué significa まど?',
							options: ['Ventana', 'Puerta', 'Mesa']
						}
					]
				},
				{
					title: 'Gramática: la forma -te',
					description: 'Peticiones, permiso, prohibición y razones.',
					content: [
						{ type: 'heading', text: '1. Forma -te' },
						{
							type: 'paragraph',
							text: 'La forma -te es fundamental. Se usa para peticiones, para unir actividades, para pedir permiso y para prohibir.'
						},
						{
							type: 'example',
							japanese: 'たべる → たべて / のむ → のんで',
							furigana: 'たべる → たべて / のむ → のんで',
							meaning: 'comer → come (y...) / beber → bebe (y...)'
						},
						{ type: 'heading', text: '2. 〜てください' },
						{
							type: 'paragraph',
							text: 'La forma -te más ください expresa una petición: «por favor, haga...».'
						},
						{
							type: 'example',
							japanese: 'きょうかしょをもってきてください。',
							furigana: 'きょうかしょをもってきてください。',
							meaning: 'Por favor, trae tu libro de texto.'
						},
						{ type: 'heading', text: '3. Describir dos actividades' },
						{
							type: 'paragraph',
							text: 'La forma -te une dos o más actividades en una sola oración.'
						},
						{
							type: 'example',
							japanese: 'あさおきて、ごはんをたべます。',
							furigana: 'あさおきて、ごはんをたべます。',
							meaning: 'Me levanto por la mañana y desayuno.'
						},
						{ type: 'heading', text: '4. 〜てもいいです' },
						{
							type: 'paragraph',
							text: 'La forma -te más もいいです expresa permiso. En pregunta, pide permiso.'
						},
						{
							type: 'example',
							japanese: 'ノートをかりてもいいですか。',
							furigana: 'ノートをかりてもいいですか。',
							meaning: '¿Puedo pedir prestado tu cuaderno?'
						},
						{ type: 'heading', text: '5. 〜てはいけません' },
						{
							type: 'paragraph',
							text: 'La forma -te más はいけません expresa prohibición.'
						},
						{
							type: 'example',
							japanese: 'クラスでねてはいけません。',
							furigana: 'クラスでねてはいけません。',
							meaning: 'No se puede dormir en clase.'
						},
						{ type: 'heading', text: '6. 〜から' },
						{
							type: 'paragraph',
							text: 'から introduce una razón y se coloca al final de la oración causal.'
						},
						{
							type: 'example',
							japanese: 'まいにちつかいますから。',
							furigana: 'まいにちつかいますから。',
							meaning: 'Porque lo usamos todos los días.'
						},
						{ type: 'heading', text: '7. 〜ましょうか (ofrecer ayuda)' },
						{
							type: 'paragraph',
							text: 'ましょうか también sirve para ofrecer ayuda al oyente.'
						},
						{
							type: 'example',
							japanese: 'にもつをもちましょうか。',
							furigana: 'にもつをもちましょうか。',
							meaning: '¿Te sostengo el equipaje?'
						}
					],
					quiz: [
						{
							prompt: '¿Qué expresa 〜てください?',
							options: ['Una petición', 'Una prohibición', 'Un permiso']
						},
						{
							prompt: '¿Qué expresa 〜てはいけません?',
							options: ['Una prohibición', 'Una petición', 'Una razón']
						},
						{
							prompt: '¿Qué significa 〜てもいいです?',
							options: ['Se permite hacer algo', 'No se permite', 'Es obligatorio']
						}
					]
				},
				{
					title: 'Notas culturales: el sistema educativo',
					description: 'Estructura de la educación en Japón.',
					content: [
						{ type: 'heading', text: 'にほんのきょういくせいど' },
						{
							type: 'paragraph',
							text: 'El sistema educativo japonés se divide en primaria, secundaria inferior y secundaria superior, seguidas de la universidad.'
						},
						{
							type: 'note',
							text: 'La asistencia y la puntualidad son muy valoradas, y el uniforme es habitual en la mayoría de los centros.'
						}
					]
				}
			]
		},
		{
			title: '第7課 かぞくのしゃしん — Foto familiar',
			description: 'Describir acciones en curso y estados resultantes.',
			lessons: [
				{
					title: 'Diálogo: la foto de familia',
					description: 'Mary describe a su familia anfitriona.',
					content: [
						{
							type: 'example',
							japanese: 'これはかぞくのしゃしんです。',
							furigana: 'これはかぞくのしゃしんです。',
							meaning: 'Esta es una foto de familia.'
						},
						{
							type: 'example',
							japanese: 'ちちはかいしゃいんです。',
							furigana: 'ちちはかいしゃいんです。',
							meaning: 'Mi padre es oficinista.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはかみがながいです。',
							furigana: 'メアリーさんはかみがながいです。',
							meaning: 'Mary tiene el pelo largo.'
						},
						{
							type: 'example',
							japanese: 'いもうとはこうこうせいです。',
							furigana: 'いもうとはこうこうせいです。',
							meaning: 'Mi hermana menor es estudiante de secundaria.'
						}
					]
				},
				{
					title: 'Vocabulario: familia y acciones',
					description: 'Verbos de estado y acciones continuas.',
					words: [
						'待つ',
						'会う',
						'知る',
						'思う',
						'考える',
						'働く',
						'休む',
						'起きる',
						'寝る',
						'歩く',
						'走る',
						'泳ぐ'
					],
					quiz: [
						{
							prompt: '¿Qué significa はたらく?',
							options: ['Trabajar', 'Descansar', 'Caminar']
						},
						{
							prompt: '¿Qué significa やすむ?',
							options: ['Descansar', 'Trabajar', 'Correr']
						},
						{
							prompt: '¿Qué significa しる?',
							options: ['Saber / conocer', 'Pensar', 'Recordar']
						}
					]
				},
				{
					title: 'Gramática: 〜ている y descripciones',
					description: 'Acción en curso, resultado, が y unir oraciones.',
					content: [
						{ type: 'heading', text: '1. 〜ている (acción en curso)' },
						{
							type: 'paragraph',
							text: 'La forma -te más います describe una acción en progreso.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはいまほんをよんでいます。',
							furigana: 'メアリーさんはいまほんをよんでいます。',
							meaning: 'Mary está leyendo un libro ahora.'
						},
						{ type: 'heading', text: '2. 〜ている (resultado de un cambio)' },
						{
							type: 'paragraph',
							text: 'Con verbos de cambio, 〜ている describe el estado resultante.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはけっこんしています。',
							furigana: 'メアリーさんはけっこんしています。',
							meaning: 'Mary está casada.'
						},
						{ type: 'heading', text: '3. XはYが〜です' },
						{
							type: 'paragraph',
							text: 'Se describe una parte del cuerpo o un atributo con が.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはかみがながいです。',
							furigana: 'メアリーさんはかみがながいです。',
							meaning: 'Mary tiene el pelo largo.'
						},
						{ type: 'heading', text: '4. Formas -te de adjetivos y sustantivos' },
						{
							type: 'paragraph',
							text: 'Los adjetivos-い usan 〜くて, los adjetivos-な y los sustantivos usan 〜で para unir oraciones.'
						},
						{
							type: 'example',
							japanese: 'このへやはひろくて、あかるいです。',
							furigana: 'このへやはひろくて、あかるいです。',
							meaning: 'Esta habitación es amplia y luminosa.'
						},
						{ type: 'heading', text: '5. Raíz verbal + に行く' },
						{
							type: 'paragraph',
							text: 'La raíz de un verbo más にいきます indica ir a hacer algo.'
						},
						{
							type: 'example',
							japanese: 'えいがをみにいきます。',
							furigana: 'えいがをみにいきます。',
							meaning: 'Voy a ver una película.'
						},
						{ type: 'heading', text: '6. Contar personas' },
						{
							type: 'paragraph',
							text: 'Las personas se cuentan con 人 (ひとり, ふたり, さんにん...).'
						},
						{
							type: 'example',
							japanese: 'かぞくはよにんです。',
							furigana: 'かぞくはよにんです。',
							meaning: 'Mi familia es de cuatro personas.'
						}
					],
					quiz: [
						{
							prompt: '¿Qué describe 〜ています con verbos de cambio?',
							options: ['El estado resultante', 'Una acción futura', 'Una prohibición']
						},
						{
							prompt: '¿Cómo se dice «tengo el pelo largo»?',
							options: ['かみがながいです', 'かみはながいです', 'かみをながいです']
						},
						{
							prompt: '¿Qué significa えいがをみにいきます?',
							options: ['Voy a ver una película', 'Vi una película', 'Quiero ver una película']
						}
					]
				},
				{
					title: 'Notas culturales: términos de parentesco',
					description: 'Cómo se llama a los miembros de la familia.',
					content: [
						{ type: 'heading', text: 'かぞくのよびかた' },
						{
							type: 'paragraph',
							text: 'Existen dos series de términos: una para la propia familia (ちち, はは) y otra para la familia ajena (おとうさん, おかあさん).'
						},
						{
							type: 'note',
							text: 'Al hablar de la propia familia se usan las formas humildes; al dirigirse a la familia de otro, las formas honoríficas.'
						}
					]
				}
			]
		},
		{
			title: '第8課 バーベキュー — Barbacoa',
			description: 'Formas cortas, estilo directo y la partícula が.',
			lessons: [
				{
					title: 'Diálogo: preparativos de la barbacoa',
					description: 'Los amigos organizan una barbacoa.',
					content: [
						{
							type: 'example',
							japanese: 'あしたはバーベキューをします。',
							furigana: 'あしたはバーベキューをします。',
							meaning: 'Mañana haremos una barbacoa.'
						},
						{
							type: 'example',
							japanese: 'なにかもってきますか。',
							furigana: 'なにかもってきますか。',
							meaning: '¿Traigo algo?'
						},
						{
							type: 'example',
							japanese: 'わたしはにくがすきです。',
							furigana: 'わたしはにくがすきです。',
							meaning: 'A mí me gusta la carne.'
						},
						{
							type: 'example',
							japanese: 'たけしさんはりょうりがじょうずです。',
							furigana: 'たけしさんはりょうりがじょうずです。',
							meaning: 'Takeshi es bueno cocinando.'
						}
					]
				},
				{
					title: 'Vocabulario: habilidad y gusto',
					description: 'Verbos y adjetivos de habilidad.',
					words: [
						'思う',
						'遊ぶ',
						'好き',
						'上手',
						'下手',
						'教える',
						'習う',
						'覚える',
						'忘れる',
						'分かる'
					],
					quiz: [
						{
							prompt: '¿Qué significa じょうず?',
							options: ['Ser hábil / bueno en algo', 'Ser torpe', 'Gustar']
						},
						{
							prompt: '¿Qué significa へた?',
							options: ['Ser torpe / malo en algo', 'Ser hábil', 'Odiar']
						},
						{
							prompt: '¿Qué significa おもう?',
							options: ['Pensar / creer', 'Olvidar', 'Enseñar']
						}
					]
				},
				{
					title: 'Gramática: formas cortas y estilo directo',
					description: 'Formas cortas, と思います, と言っていました y が.',
					content: [
						{ type: 'heading', text: '1. Formas cortas' },
						{
							type: 'paragraph',
							text: 'Las formas cortas son la base del habla informal y de la cita indirecta. Se forman a partir de la forma diccionario.'
						},
						{
							type: 'example',
							japanese: 'たべる / たべない',
							furigana: 'たべる / たべない',
							meaning: 'comer / no comer (forma corta)'
						},
						{ type: 'heading', text: '2. Formas cortas en habla informal' },
						{
							type: 'paragraph',
							text: 'Entre amigos y familia se usa la forma corta sin です ni ます.'
						},
						{
							type: 'example',
							japanese: 'あしたバーベキューをする？',
							furigana: 'あしたバーベキューをする？',
							meaning: '¿Mañana haces la barbacoa?'
						},
						{ type: 'heading', text: '3. 〜と思います' },
						{
							type: 'paragraph',
							text: 'La forma corta más とおもいます expresa opinión o creencia.'
						},
						{
							type: 'example',
							japanese: 'あしたはあめがふるとおもいます。',
							furigana: 'あしたはあめがふるとおもいます。',
							meaning: 'Creo que mañana lloverá.'
						},
						{ type: 'heading', text: '4. 〜と言っていました' },
						{
							type: 'paragraph',
							text: 'La forma corta más といっていました reproduce lo que dijo otra persona.'
						},
						{
							type: 'example',
							japanese: 'たけしさんはくるといっていました。',
							furigana: 'たけしさんはくるといっていました。',
							meaning: 'Takeshi dijo que vendría.'
						},
						{ type: 'heading', text: '5. 〜ないでください' },
						{
							type: 'paragraph',
							text: 'La forma negativa corta más でください expresa una petición negativa.'
						},
						{
							type: 'example',
							japanese: 'わすれないでください。',
							furigana: 'わすれないでください。',
							meaning: 'Por favor, no lo olvides.'
						},
						{ type: 'heading', text: '6. Verbo のが好きです / 上手です' },
						{
							type: 'paragraph',
							text: 'El verbo en forma diccionario más のがすきです o がじょうずです indica gusto o habilidad.'
						},
						{
							type: 'example',
							japanese: 'りょうりをつくるのがじょうずです。',
							furigana: 'りょうりをつくるのがじょうずです。',
							meaning: 'Es bueno cocinando.'
						},
						{ type: 'heading', text: '7. La partícula de sujeto が' },
						{
							type: 'paragraph',
							text: 'が marca el sujeto, especialmente con adjetivos como すき, じょうず y わかる.'
						},
						{
							type: 'example',
							japanese: 'にほんごがわかります。',
							furigana: 'にほんごがわかります。',
							meaning: 'Entiendo japonés.'
						},
						{ type: 'heading', text: '8. 何か y 何も' },
						{
							type: 'paragraph',
							text: 'なにか significa «algo» y なにも «nada», este último con verbo negativo.'
						},
						{
							type: 'example',
							japanese: 'なにもたべませんでした。',
							furigana: 'なにもたべませんでした。',
							meaning: 'No comí nada.'
						}
					],
					quiz: [
						{
							prompt: '¿Qué expresa 〜と思います?',
							options: ['Una opinión o creencia', 'Una orden', 'Una prohibición']
						},
						{
							prompt: '¿Qué significa なにも + verbo negativo?',
							options: ['Nada', 'Algo', 'Todo']
						},
						{
							prompt: '¿Qué partícula se usa con じょうず?',
							options: ['が', 'を', 'に']
						}
					]
				},
				{
					title: 'Notas culturales: la comida en Japón',
					description: 'Platos y costumbres culinarias.',
					content: [
						{ type: 'heading', text: 'にほんのたべもの' },
						{
							type: 'paragraph',
							text: 'La cocina japonesa combina arroz, pescado, verduras y sopa de miso. El おべんとう es una comida preparada para llevar.'
						},
						{
							type: 'note',
							text: 'Antes de comer se dice いただきます y al terminar ごちそうさまでした.'
						}
					]
				}
			]
		},
		{
			title: '第9課 かぶき — Kabuki',
			description: 'Formas cortas del pasado y calificar sustantivos.',
			lessons: [
				{
					title: 'Diálogo: planes para el kabuki',
					description: 'Los amigos hablan de una obra de kabuki.',
					content: [
						{
							type: 'example',
							japanese: 'かぶきをみたことがありますか。',
							furigana: 'かぶきをみたことがありますか。',
							meaning: '¿Has visto kabuki alguna vez?'
						},
						{
							type: 'example',
							japanese: 'いいえ、まだみていません。',
							furigana: 'いいえ、まだみていません。',
							meaning: 'No, todavía no lo he visto.'
						},
						{
							type: 'example',
							japanese: 'もうチケットをかいました。',
							furigana: 'もうチケットをかいました。',
							meaning: 'Ya compré las entradas.'
						},
						{
							type: 'example',
							japanese: 'おもしろいとおもいます。',
							furigana: 'おもしろいとおもいます。',
							meaning: 'Creo que es interesante.'
						}
					]
				},
				{
					title: 'Vocabulario: memoria y opinión',
					description: 'Verbos de conocimiento y pensamiento.',
					words: ['知る', '思う', '考える', '分かる', '覚える', '忘れる', '教える', '習う'],
					quiz: [
						{
							prompt: '¿Qué significa かんがえる?',
							options: ['Pensar / reflexionar', 'Olvidar', 'Saber']
						},
						{
							prompt: '¿Qué significa おぼえる?',
							options: ['Memorizar', 'Olvidar', 'Entender']
						},
						{
							prompt: '¿Qué significa わかる?',
							options: ['Entender', 'Pensar', 'Enseñar']
						}
					]
				},
				{
					title: 'Gramática: pasado corto y もう/まだ',
					description: 'Pasado corto, calificar sustantivos y から.',
					content: [
						{ type: 'heading', text: '1. Formas cortas del pasado' },
						{
							type: 'paragraph',
							text: 'El pasado corto afirmativo de los verbos termina en 〜た y el negativo en 〜なかった.'
						},
						{
							type: 'example',
							japanese: 'たべた / たべなかった',
							furigana: 'たべた / たべなかった',
							meaning: 'comí / no comí (forma corta)'
						},
						{ type: 'heading', text: '2. Formas cortas del pasado en habla informal' },
						{
							type: 'paragraph',
							text: 'En conversación informal se usa el pasado corto sin です ni ます.'
						},
						{
							type: 'example',
							japanese: 'きのうえいがをみた？',
							furigana: 'きのうえいがをみた？',
							meaning: '¿Viste una película ayer?'
						},
						{ type: 'heading', text: '3. 〜と思います (pasado)' },
						{
							type: 'paragraph',
							text: 'El pasado corto más とおもいます expresa una opinión sobre el pasado.'
						},
						{
							type: 'example',
							japanese: 'たけしさんはもうかえったとおもいます。',
							furigana: 'たけしさんはもうかえったとおもいます。',
							meaning: 'Creo que Takeshi ya se fue.'
						},
						{ type: 'heading', text: '4. 〜と言っていました (pasado)' },
						{
							type: 'paragraph',
							text: 'El pasado corto más といっていました reproduce lo dicho por otra persona.'
						},
						{
							type: 'example',
							japanese: 'メアリーさんはかぶきをみたといっていました。',
							furigana: 'メアリーさんはかぶきをみたといっていました。',
							meaning: 'Mary dijo que había visto kabuki.'
						},
						{ type: 'heading', text: '5. Calificar sustantivos con verbos y adjetivos' },
						{
							type: 'paragraph',
							text: 'La forma corta puede modificar directamente a un sustantivo.'
						},
						{
							type: 'example',
							japanese: 'きのうかったほん',
							furigana: 'きのうかったほん',
							meaning: 'el libro que compré ayer'
						},
						{ type: 'heading', text: '6. もう〜ました y まだ〜ていません' },
						{
							type: 'paragraph',
							text: 'もう indica que algo ya ocurrió; まだ〜ていません que aún no ha ocurrido.'
						},
						{
							type: 'example',
							japanese: 'もうひるごはんをたべました。',
							furigana: 'もうひるごはんをたべました。',
							meaning: 'Ya almorcé.'
						},
						{
							type: 'example',
							japanese: 'まだたべていません。',
							furigana: 'まだたべていません。',
							meaning: 'Todavía no he comido.'
						},
						{ type: 'heading', text: '7. Explicación から、Situación' },
						{
							type: 'paragraph',
							text: 'La estructura «Razón から、Situación» presenta primero la causa y luego el resultado.'
						},
						{
							type: 'example',
							japanese: 'あめですから、でかけません。',
							furigana: 'あめですから、でかけません。',
							meaning: 'Como está lloviendo, no salgo.'
						}
					],
					quiz: [
						{
							prompt: '¿Cuál es el pasado corto negativo de たべる?',
							options: ['たべなかった', 'たべませんでした', 'たべない']
						},
						{
							prompt: '¿Qué significa まだ〜ていません?',
							options: ['Todavía no he hecho algo', 'Ya lo hice', 'Nunca lo haré']
						},
						{
							prompt: '¿Qué significa もう?',
							options: ['Ya', 'Todavía', 'Nunca']
						}
					]
				},
				{
					title: 'Notas culturales: la cultura tradicional',
					description: 'Kabuki, teatro y artes tradicionales.',
					content: [
						{ type: 'heading', text: 'にほんのでんとうぶんか' },
						{
							type: 'paragraph',
							text: 'El kabuki es una forma de teatro tradicional con música, danza y maquillaje elaborado. Los papeles femeninos los interpretan actores especializados.'
						},
						{
							type: 'note',
							text: 'Otras artes tradicionales son el のう, la ceremonia del té y el いけばな.'
						}
					]
				}
			]
		},
		{
			title: '第10課 ふゆやすみのよてい — Planes para las vacaciones',
			description: 'Comparar cosas y expresar intenciones.',
			lessons: [
				{
					title: 'Diálogo: planes de invierno',
					description: 'Los amigos comparan destinos y hacen planes.',
					content: [
						{
							type: 'example',
							japanese: 'ふゆやすみはどこかにいきますか。',
							furigana: 'ふゆやすみはどこかにいきますか。',
							meaning: '¿Vas a algún sitio en las vacaciones de invierno?'
						},
						{
							type: 'example',
							japanese: 'きょうとよりおおさかのほうがにぎやかです。',
							furigana: 'きょうとよりおおさかのほうがにぎやかです。',
							meaning: 'Osaka es más animada que Kioto.'
						},
						{
							type: 'example',
							japanese: 'ほっかいどうにいくつもりです。',
							furigana: 'ほっかいどうにいくつもりです。',
							meaning: 'Tengo la intención de ir a Hokkaido.'
						},
						{
							type: 'example',
							japanese: 'でんしゃでいきます。',
							furigana: 'でんしゃでいきます。',
							meaning: 'Iré en tren.'
						}
					]
				},
				{
					title: 'Vocabulario: comparación y cualidades',
					description: 'Adjetivos y adjetivos-な para comparar.',
					words: [
						'大きい',
						'小さい',
						'高い',
						'安い',
						'新しい',
						'古い',
						'便利',
						'不便',
						'簡単',
						'難しい',
						'静か',
						'賑やか'
					],
					quiz: [
						{
							prompt: '¿Qué significa べんり?',
							options: ['Práctico / conveniente', 'Incómodo', 'Difícil']
						},
						{
							prompt: '¿Qué significa ふべん?',
							options: ['Incómodo / poco práctico', 'Conveniente', 'Fácil']
						},
						{
							prompt: '¿Qué significa かんたん?',
							options: ['Fácil / sencillo', 'Difícil', 'Animado']
						}
					]
				},
				{
					title: 'Gramática: comparaciones y つもり',
					description: 'Comparar dos o más cosas, 〜つもりだ y 〜なる.',
					content: [
						{ type: 'heading', text: '1. Comparación entre dos cosas' },
						{
							type: 'paragraph',
							text: '«AはBより〜です» significa que A es más... que B. También se usa «Aのほうが〜です».'
						},
						{
							type: 'example',
							japanese: 'でんしゃはバスよりはやいです。',
							furigana: 'でんしゃはバスよりはやいです。',
							meaning: 'El tren es más rápido que el autobús.'
						},
						{ type: 'heading', text: '2. Comparación entre tres o más cosas' },
						{
							type: 'paragraph',
							text: '«〜のなかでAがいちばん〜です» expresa el superlativo.'
						},
						{
							type: 'example',
							japanese: 'にほんのなかでとうきょうがいちばんおおきいです。',
							furigana: 'にほんのなかでとうきょうがいちばんおおきいです。',
							meaning: 'Tokio es la más grande de Japón.'
						},
						{ type: 'heading', text: '3. Adjetivo/sustantivo + の' },
						{
							type: 'paragraph',
							text: 'の sustituye a un sustantivo ya mencionado para evitar repetirlo.'
						},
						{
							type: 'example',
							japanese: 'あかいかばんよりあおいののほうがすきです。',
							furigana: 'あかいかばんよりあおいののほうがすきです。',
							meaning: 'Me gusta más el azul que el bolso rojo.'
						},
						{ type: 'heading', text: '4. 〜つもりだ' },
						{
							type: 'paragraph',
							text: 'La forma diccionario más つもりです expresa una intención firme.'
						},
						{
							type: 'example',
							japanese: 'にほんにいくつもりです。',
							furigana: 'にほんにいくつもりです。',
							meaning: 'Tengo la intención de ir a Japón.'
						},
						{ type: 'heading', text: '5. Adjetivo + なる' },
						{
							type: 'paragraph',
							text: 'El adjetivo en forma adverbial más なります indica un cambio de estado.'
						},
						{
							type: 'example',
							japanese: 'にほんごがじょうずになりました。',
							furigana: 'にほんごがじょうずになりました。',
							meaning: 'Me he vuelto bueno en japonés.'
						},
						{ type: 'heading', text: '6. どこかに / どこにも' },
						{
							type: 'paragraph',
							text: 'どこかに significa «a algún lugar» y どこにも «a ningún lugar», con verbo negativo.'
						},
						{
							type: 'example',
							japanese: 'どこにもいきませんでした。',
							furigana: 'どこにもいきませんでした。',
							meaning: 'No fui a ningún sitio.'
						},
						{ type: 'heading', text: '7. で' },
						{
							type: 'paragraph',
							text: 'で indica el medio o herramienta con la que se hace algo.'
						},
						{
							type: 'example',
							japanese: 'でんしゃでいきます。',
							furigana: 'でんしゃでいきます。',
							meaning: 'Iré en tren.'
						}
					],
					quiz: [
						{
							prompt: '¿Qué significa «AはBより〜です»?',
							options: ['A es más... que B', 'A es menos... que B', 'A es igual que B']
						},
						{
							prompt: '¿Qué expresa 〜つもりです?',
							options: ['Una intención', 'Una prohibición', 'Una comparación']
						},
						{
							prompt: '¿Qué significa いちばん?',
							options: ['El más / el número uno', 'Menos', 'Igual']
						}
					]
				},
				{
					title: 'Notas culturales: el transporte público',
					description: 'Trenes, metro y autobuses en Japón.',
					content: [
						{ type: 'heading', text: 'にほんのこうつうきかん' },
						{
							type: 'paragraph',
							text: 'El transporte público japonés es puntual y eficiente. Los trenes se dividen por compañías y por velocidad (local, rápido, expreso).'
						},
						{
							type: 'note',
							text: 'Las tarjetas IC permiten pagar trenes, metro y autobuses con un solo soporte.'
						}
					]
				}
			]
		},
		{
			title: '第11課 やすみのあと — Después de las vacaciones',
			description: 'Expresar deseos y enumerar actividades.',
			lessons: [
				{
					title: 'Diálogo: después del viaje',
					description: 'Los amigos cuentan qué querían hacer.',
					content: [
						{
							type: 'example',
							japanese: 'なつやすみにどこかへいきたいです。',
							furigana: 'なつやすみにどこかへいきたいです。',
							meaning: 'Quiero ir a algún sitio en las vacaciones de verano.'
						},
						{
							type: 'example',
							japanese: 'やすみのひはほんをよんだり、おんがくをきいたりします。',
							furigana: 'やすみのひはほんをよんだり、おんがくをきいたりします。',
							meaning: 'Los días libres leo libros y escucho música, entre otras cosas.'
						},
						{
							type: 'example',
							japanese: 'きょうとにいったことがあります。',
							furigana: 'きょうとにいったことがあります。',
							meaning: 'He ido a Kioto alguna vez.'
						},
						{
							type: 'example',
							japanese: 'りんごやみかんをかいました。',
							furigana: 'りんごやみかんをかいました。',
							meaning: 'Compré manzanas y mandarinas, entre otras cosas.'
						}
					]
				},
				{
					title: 'Vocabulario: deseos y actividades',
					description: 'Verbos para expresar deseos y enumerar.',
					words: ['行く', '見る', '食べる', '飲む', '買う', '会う', '遊ぶ', '休む', '読む', '聞く'],
					quiz: [
						{
							prompt: '¿Qué significa 〜たいです?',
							options: ['Quiero hacer algo', 'Debo hacer algo', 'Puedo hacer algo']
						},
						{
							prompt: '¿Qué significa 〜たり〜たりします?',
							options: [
								'Hacer esto y aquello, entre otras cosas',
								'Hacer solo una cosa',
								'No hacer nada'
							]
						},
						{
							prompt: '¿Qué significa 〜たことがあります?',
							options: ['Haber hecho algo alguna vez', 'Querer hacer algo', 'Ir a hacer algo']
						}
					]
				},
				{
					title: 'Gramática: deseos y enumeración',
					description: '〜たい, 〜たり〜たり, 〜ことがある y や.',
					content: [
						{ type: 'heading', text: '1. 〜たい' },
						{
							type: 'paragraph',
							text: 'La raíz verbal más たいです expresa el deseo del hablante. El objeto puede llevar を o が.'
						},
						{
							type: 'example',
							japanese: 'にほんにいきたいです。',
							furigana: 'にほんにいきたいです。',
							meaning: 'Quiero ir a Japón.'
						},
						{ type: 'heading', text: '2. 〜たり〜たりする' },
						{
							type: 'paragraph',
							text: 'El pasado corto más り, repetido, enumera acciones representativas.'
						},
						{
							type: 'example',
							japanese: 'やすみのひはほんをよんだり、おんがくをきいたりします。',
							furigana: 'やすみのひはほんをよんだり、おんがくをきいたりします。',
							meaning: 'Los días libres leo libros y escucho música, entre otras cosas.'
						},
						{ type: 'heading', text: '3. 〜ことがある' },
						{
							type: 'paragraph',
							text: 'El pasado corto más ことがあります indica que se ha tenido una experiencia.'
						},
						{
							type: 'example',
							japanese: 'かぶきをみたことがあります。',
							furigana: 'かぶきをみたことがあります。',
							meaning: 'He visto kabuki alguna vez.'
						},
						{ type: 'heading', text: '4. Sustantivo A や Sustantivo B' },
						{
							type: 'paragraph',
							text: 'や enumera sustantivos de forma no exhaustiva, a diferencia de と, que es completa.'
						},
						{
							type: 'example',
							japanese: 'りんごやみかんをかいました。',
							furigana: 'りんごやみかんをかいました。',
							meaning: 'Compré manzanas y mandarinas, entre otras cosas.'
						}
					],
					quiz: [
						{
							prompt: '¿Qué diferencia hay entre と y や?',
							options: [
								'と es exhaustivo; や no lo es',
								'や es exhaustivo; と no lo es',
								'Son idénticos'
							]
						},
						{
							prompt: '¿Qué significa 〜たことがあります?',
							options: ['Haber tenido una experiencia', 'Querer hacer algo', 'Estar haciendo algo']
						},
						{
							prompt: '¿Qué expresa 〜たいです?',
							options: ['Un deseo del hablante', 'Una orden', 'Una prohibición']
						}
					]
				},
				{
					title: 'Notas culturales: el Año Nuevo',
					description: 'お正月 y las tradiciones de fin de año.',
					content: [
						{ type: 'heading', text: 'おしょうがつ' },
						{
							type: 'paragraph',
							text: 'El Año Nuevo es la festividad más importante de Japón. Las familias se reúnen, visitan templos y santuarios, y envían tarjetas de felicitación.'
						},
						{
							type: 'note',
							text: 'Es costumbre comer おせち y もち, y los niños reciben おとしだま (sobres con dinero).'
						}
					]
				}
			]
		},
		{
			title: '第12課 びょうき — Sentirse enfermo',
			description: 'Explicar síntomas, dar consejos y expresar obligación.',
			lessons: [
				{
					title: 'Diálogo: en el médico',
					description: 'Mary no se siente bien y pide consejo.',
					content: [
						{
							type: 'example',
							japanese: 'どうしたんですか。',
							furigana: 'どうしたんですか。',
							meaning: '¿Qué te pasa?'
						},
						{
							type: 'example',
							japanese: 'あたまがいたいんです。',
							furigana: 'あたまがいたいんです。',
							meaning: 'Es que me duele la cabeza.'
						},
						{
							type: 'example',
							japanese: 'くすりをのんだほうがいいですよ。',
							furigana: 'くすりをのんだほうがいいですよ。',
							meaning: 'Sería mejor que tomaras medicina.'
						},
						{
							type: 'example',
							japanese: 'びょういんにいかなければいけません。',
							furigana: 'びょういんにいかなければいけません。',
							meaning: 'Tengo que ir al hospital.'
						}
					]
				},
				{
					title: 'Vocabulario: salud y estado',
					description: 'Sustantivos y adjetivos de salud.',
					words: [
						'病気',
						'元気',
						'大丈夫',
						'危ない',
						'大切',
						'天気',
						'雨',
						'雪',
						'風',
						'晴れ',
						'曇り'
					],
					quiz: [
						{
							prompt: '¿Qué significa びょうき?',
							options: ['Enfermedad', 'Salud', 'Medicina']
						},
						{
							prompt: '¿Qué significa だいじょうぶ?',
							options: ['Estar bien / no hay problema', 'Estar enfermo', 'Ser peligroso']
						},
						{
							prompt: '¿Qué significa あぶない?',
							options: ['Peligroso', 'Seguro', 'Importante']
						}
					]
				},
				{
					title: 'Gramática: explicación y obligación',
					description: '〜んです, 〜すぎる, 〜ほうがいい y obligación.',
					content: [
						{ type: 'heading', text: '1. 〜んです' },
						{
							type: 'paragraph',
							text: 'La forma corta más んです añade énfasis explicativo, como si respondiera a un «¿por qué?».'
						},
						{
							type: 'example',
							japanese: 'あたまがいたいんです。',
							furigana: 'あたまがいたいんです。',
							meaning: 'Es que me duele la cabeza.'
						},
						{ type: 'heading', text: '2. 〜すぎる' },
						{
							type: 'paragraph',
							text: 'La raíz de un adjetivo o verbo más すぎます indica exceso.'
						},
						{
							type: 'example',
							japanese: 'たべすぎました。',
							furigana: 'たべすぎました。',
							meaning: 'Comí demasiado.'
						},
						{ type: 'heading', text: '3. 〜ほうがいいです' },
						{
							type: 'paragraph',
							text: 'El pasado corto más ほうがいいです da un consejo.'
						},
						{
							type: 'example',
							japanese: 'やすんだほうがいいですよ。',
							furigana: 'やすんだほうがいいですよ。',
							meaning: 'Sería mejor que descansaras.'
						},
						{ type: 'heading', text: '4. 〜ので' },
						{
							type: 'paragraph',
							text: 'ので introduce una razón de forma más suave que から.'
						},
						{
							type: 'example',
							japanese: 'あめなので、でかけません。',
							furigana: 'あめなので、でかけません。',
							meaning: 'Como está lloviendo, no salgo.'
						},
						{ type: 'heading', text: '5. 〜なければいけません' },
						{
							type: 'paragraph',
							text: 'La forma negativa corta sin い más ければいけません expresa obligación. La variante coloquial es 〜なきゃいけません.'
						},
						{
							type: 'example',
							japanese: 'びょういんにいかなければいけません。',
							furigana: 'びょういんにいかなければいけません。',
							meaning: 'Tengo que ir al hospital.'
						},
						{ type: 'heading', text: '6. 〜でしょうか' },
						{
							type: 'paragraph',
							text: 'でしょうか es una forma cortés y suave de preguntar.'
						},
						{
							type: 'example',
							japanese: 'あしたはあめでしょうか。',
							furigana: 'あしたはあめでしょうか。',
							meaning: '¿Lloverá mañana?'
						}
					],
					quiz: [
						{
							prompt: '¿Qué expresa 〜なければいけません?',
							options: ['Obligación', 'Permiso', 'Prohibición']
						},
						{
							prompt: '¿Qué expresa 〜ほうがいいです?',
							options: ['Un consejo', 'Una orden', 'Una comparación']
						},
						{
							prompt: '¿Qué significa 〜すぎます?',
							options: ['Hacer algo en exceso', 'Hacer algo poco', 'No hacer nada']
						}
					]
				},
				{
					title: 'Notas culturales: el clima',
					description: 'Estaciones y clima en Japón.',
					content: [
						{ type: 'heading', text: 'にほんのきこう' },
						{
							type: 'paragraph',
							text: 'Japón tiene cuatro estaciones marcadas. La primavera y el otoño son suaves; el verano es húmedo y caluroso, y el invierno frío.'
						},
						{
							type: 'note',
							text: 'La temporada de lluvias se llama つゆ y llega a principios del verano.'
						}
					]
				}
			]
		}
	]
};

async function seed() {
	const client = postgres(DATABASE_URL as string);
	const db = drizzle(client);

	try {
		// Resolve every word referenced by the catalog to its note id.
		const allWords = course.units.flatMap((unit) =>
			unit.lessons.flatMap((lesson) => lesson.words ?? [])
		);
		const wordRows = allWords.length
			? await db
					.select({ id: notes.id, word: sql<string>`${notes.metadata}->>'word'` })
					.from(notes)
					.where(inArray(sql`${notes.metadata}->>'word'`, allWords))
			: [];

		const idByWord = new Map(wordRows.map((row) => [row.word, row.id]));
		const missing = allWords.filter((word) => !idByWord.has(word));
		if (missing.length > 0) {
			throw new Error(`No se encontraron notas para: ${missing.join(', ')}`);
		}

		// Upsert the course by slug so re-running the seed is safe.
		const [existing] = await db
			.select({ id: courses.id })
			.from(courses)
			.where(eq(courses.slug, course.slug));

		const courseId =
			existing?.id ??
			(
				await db
					.insert(courses)
					.values({
						slug: course.slug,
						title: course.title,
						subtitle: course.subtitle,
						description: course.description,
						glyph: course.glyph,
						level: course.level,
						position: 1,
						published: 1
					})
					.returning({ id: courses.id })
			)[0].id;

		// Rebuild the course tree so re-running does not duplicate units/lessons.
		await db.delete(courseUnits).where(eq(courseUnits.courseId, courseId));

		let lessonCount = 0;
		let quizCount = 0;

		for (const [unitIndex, unit] of course.units.entries()) {
			const [unitRow] = await db
				.insert(courseUnits)
				.values({
					courseId,
					title: unit.title,
					description: unit.description,
					position: unitIndex
				})
				.returning({ id: courseUnits.id });

			for (const [lessonIndex, lesson] of unit.lessons.entries()) {
				const [lessonRow] = await db
					.insert(lessons)
					.values({
						unitId: unitRow.id,
						title: lesson.title,
						description: lesson.description,
						content: lesson.content ?? null,
						position: lessonIndex
					})
					.returning({ id: lessons.id });

				if (lesson.words?.length) {
					await db.insert(lessonNotes).values(
						lesson.words.map((word, position) => ({
							lessonId: lessonRow.id,
							noteId: idByWord.get(word)!,
							position
						}))
					);
				}

				for (const [questionIndex, question] of (lesson.quiz ?? []).entries()) {
					const [questionRow] = await db
						.insert(quizQuestions)
						.values({
							lessonId: lessonRow.id,
							prompt: question.prompt,
							position: questionIndex
						})
						.returning({ id: quizQuestions.id });

					await db.insert(quizOptions).values(
						question.options.map((label, position) => ({
							questionId: questionRow.id,
							label,
							// The first option is the correct answer by convention.
							correct: position === 0,
							position
						}))
					);

					quizCount += 1;
				}

				lessonCount += 1;
			}
		}

		console.log(
			`Seeded course "${course.title}" with ${course.units.length} units, ${lessonCount} lessons and ${quizCount} quiz questions.`
		);
	} finally {
		await client.end();
	}
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});
