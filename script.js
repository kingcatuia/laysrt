
/* =========================================================
   STATE
========================================================= */

let selectedFile = null;

let subtitles = [];

let originalSrt = '';

let translatedSrt = '';

let activeDictionary = 'normal';

let previewMode = 'original';

let translationRunning = false;

let translationAbortController = null;

// Bản dịch gốc của máy/AI (đã chuẩn hóa) — mốc để "Học từ bản dịch đã sửa" không bị mất
// khi người dùng bấm Lưu thay đổi hoặc tải file.
let translatedBaseline = [];

// ---- LaySRT: trạng thái mở rộng (nhập SRT / trình sửa / LiteRouter) ----
// Văn bản nguồn lúc nhập (để so sánh / hoàn lại).
let sourceBaseline = [];

// SRT nhập vào: { bytes, name, encoding, eol } — tải lại đúng từng byte.
let importedOriginal = null;

// Bản dịch đang sửa, khớp từng dòng với subtitles.
let translatedList = [];

// Văn bản nguồn tại thời điểm dịch (đánh dấu dòng nguồn đã đổi sau khi dịch).
let translatedSource = [];

// Cờ cảnh báo từ máy chủ LiteRouter: chỉ số dòng -> mảng mã cờ.
let liteFlags = {};

const MEMORY_KEY =
    'laysrt_translation_memory_v2';

const SETTINGS_KEY = 'laysrt_settings_v1';

// (Cấu hình thống kê khách nằm trong mục "THỐNG KÊ KHÁCH — bản 2")

let translationMemory = [];


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id =>
    document.getElementById(id);


const dropZone =
    $('dropZone');

const fileInput =
    $('fileInput');

const convertBtn =
    $('convertBtn');

const fileInfo =
    $('fileInfo');

const fileName =
    $('fileName');

const fileSize =
    $('fileSize');

const convertStatus =
    $('convertStatus');

const stats =
    $('stats');

const subtitleCount =
    $('subtitleCount');

const durationInfo =
    $('durationInfo');

const memoryCountStat =
    $('memoryCountStat');

const totalVisitors =
    $('totalVisitors');

const onlineVisitors =
    $('onlineVisitors');

const devtoolsBlocker =
    $('devtoolsBlocker');

const translationSection =
    $('translationSection');

const translationMethod =
    $('translationMethod');

const sourceLanguage =
    $('sourceLanguage');

const targetLanguage =
    $('targetLanguage');

const translationMode =
    $('translationMode');

const translationStyle =
    $('translationStyle');

const accuracyLevel =
    $('accuracyLevel');

const batchSize =
    $('batchSize');

const aiPromptOptions =
    $('aiPromptOptions');

const promptPreset =
    $('promptPreset');

const customPrompt =
    $('customPrompt');

const resetPromptBtn =
    $('resetPromptBtn');

const geminiOptions =
    $('geminiOptions');

const geminiKey =
    $('geminiKey');

const geminiModel =
    $('geminiModel');

const geminiThinking =
    $('geminiThinking');

const groqOptions =
    $('groqOptions');

const groqKey =
    $('groqKey');

const groqModel =
    $('groqModel');

const deepseekOptions =
    $('deepseekOptions');

const deepseekKey =
    $('deepseekKey');

const deepseekModel =
    $('deepseekModel');

const deepseekReasoning =
    $('deepseekReasoning');

const openaiOptions =
    $('openaiOptions');

const openaiKey =
    $('openaiKey');

const openaiModel =
    $('openaiModel');

const openaiReasoning =
    $('openaiReasoning');

const openrouterOptions =
    $('openrouterOptions');

const openrouterKey =
    $('openrouterKey');

const openrouterModel =
    $('openrouterModel');

const builtinOptions =
    $('builtinOptions');

const dictionaryResult =
    $('dictionaryResult');

const dictionaryCards =
    document.querySelectorAll(
        '.dictionary-card'
    );

const memoryBadge =
    $('memoryBadge');

const memoryInput =
    $('memoryInput');

const saveMemoryBtn =
    $('saveMemoryBtn');

const learnEditedBtn =
    $('learnEditedBtn');

const exportMemoryBtn =
    $('exportMemoryBtn');

const memoryImportInput =
    $('memoryImportInput');

const clearMemoryBtn =
    $('clearMemoryBtn');

const translateBtn =
    $('translateBtn');

const stopTranslateBtn =
    $('stopTranslateBtn');

const downloadOriginalBtn =
    $('downloadOriginalBtn');

const downloadTranslatedBtn =
    $('downloadTranslatedBtn');

const translationStatus =
    $('translationStatus');

const progressWrapper =
    $('progressWrapper');

const progressFill =
    $('progressFill');

const progressText =
    $('progressText');

const previewSection =
    $('previewSection');

const preview =
    $('preview');

const previewOriginalBtn =
    $('previewOriginalBtn');

const previewTranslatedBtn =
    $('previewTranslatedBtn');

const saveEditedPreviewBtn =
    $('saveEditedPreviewBtn');


/* =========================================================
   PROMPTS
========================================================= */

const PROMPT_PRESETS = {

natural: `
Bạn là chuyên gia dịch phụ đề phim Trung Quốc sang tiếng Việt.

Mục tiêu:
Tạo bản dịch tự nhiên như phụ đề phim Việt Nam được biên tập thủ công.

Yêu cầu:
- Dịch đúng ý, đúng ngữ cảnh.
- Không dịch máy móc từng chữ.
- Ưu tiên câu tiếng Việt tự nhiên.
- Giữ cảm xúc nhân vật.
- Xưng hô phải dựa trên quan hệ và ngữ cảnh.
- Không tự ý thêm nội dung.
- Không giải thích.
- Không chú thích.
- Không đổi tên riêng nếu không có lý do.
- Giữ nguyên số lượng dòng.
`.trim(),

xianxia: `
Bạn là chuyên gia dịch phụ đề phim Trung Quốc thể loại tu tiên,
tiên hiệp, cổ phong.

Yêu cầu:
- Giữ không khí cổ phong.
- Xưng hô chính xác giữa sư tôn, đệ tử,
  tiền bối, hậu bối, sư huynh, sư tỷ...
- Thuật ngữ phải nhất quán.
- Ưu tiên thuật ngữ quen thuộc trong cộng đồng Vietsub.
- Không dịch máy móc.
- Không thêm giải thích.
- Không tự ý đổi tên.
- Giữ nguyên số lượng dòng.
`.trim(),

romance: `
Bạn là chuyên gia dịch phụ đề ngôn tình và drama Trung Quốc.

Yêu cầu:
- Dịch tự nhiên và giàu cảm xúc.
- Giữ đúng sắc thái tình cảm.
- Xưng hô dựa trên quan hệ và bối cảnh.
- Không làm câu tiếng Việt cứng như máy dịch.
- Không thêm giải thích.
- Không thêm chú thích.
- Giữ nguyên số lượng dòng.
`.trim(),

shortdrama: `
Bạn là chuyên gia dịch short drama Trung Quốc sang tiếng Việt.

Mục tiêu:
Tạo phụ đề ngắn, tự nhiên và dễ đọc trên điện thoại.

Yêu cầu:
- Câu gọn nhưng không mất ý.
- Giữ cảm xúc.
- Giữ đúng xưng hô.
- Ưu tiên cách nói đời thường.
- Không dịch từng chữ máy móc.
- Không thêm giải thích.
- Giữ nguyên số lượng dòng.
`.trim(),

accurate: `
Bạn là biên tập viên dịch phụ đề chuyên nghiệp.

Mục tiêu:
Ưu tiên độ chính xác của ý nghĩa và ngữ cảnh,
sau đó mới tối ưu độ tự nhiên của tiếng Việt.

Yêu cầu:
- Xác định đúng chủ thể, đối tượng và quan hệ nhân vật.
- Không suy diễn thêm thông tin không có.
- Giữ sắc thái câu nói.
- Kiểm tra nghĩa theo ngữ cảnh trước khi chọn từ.
- Xưng hô phải nhất quán.
- Thuật ngữ lặp lại phải dịch thống nhất.
- Không bỏ ý.
- Không thêm ý.
- Không giải thích.
- Giữ nguyên số lượng dòng.
`.trim()

};


/* =========================================================
   DICTIONARIES
========================================================= */

const COMMON_DICTIONARY = {

    '你好':
        'Xin chào',

    '您好':
        'Xin chào',

    '谢谢':
        'Cảm ơn',

    '谢谢你':
        'Cảm ơn bạn',

    '对不起':
        'Xin lỗi',

    '抱歉':
        'Xin lỗi',

    '没关系':
        'Không sao',

    '没事':
        'Không sao',

    '再见':
        'Tạm biệt',

    '好久不见':
        'Lâu rồi không gặp',

    '什么':
        'Cái gì',

    '为什么':
        'Tại sao',

    '怎么了':
        'Sao vậy',

    '怎么办':
        'Phải làm sao',

    '怎么样':
        'Thế nào',

    '哪里':
        'Ở đâu',

    '谁':
        'Ai',

    '什么时候':
        'Khi nào',

    '知道':
        'Biết',

    '不知道':
        'Không biết',

    '明白':
        'Hiểu',

    '不明白':
        'Không hiểu',

    '可以':
        'Có thể',

    '不可以':
        'Không thể',

    '行':
        'Được',

    '不行':
        'Không được',

    '当然':
        'Đương nhiên',

    '真的':
        'Thật sao',

    '真的吗':
        'Thật à',

    '可能':
        'Có thể',

    '一定':
        'Nhất định',

    '等等':
        'Khoan đã',

    '等一下':
        'Đợi một chút',

    '我知道':
        'Tôi biết',

    '我不知道':
        'Tôi không biết',

    '我明白':
        'Tôi hiểu',

    '我不明白':
        'Tôi không hiểu',

    '我喜欢你':
        'Tôi thích bạn',

    '我爱你':
        'Tôi yêu bạn',

    '快走':
        'Mau đi',

    '快点':
        'Nhanh lên',

    '走吧':
        'Đi thôi',

    '过来':
        'Lại đây',

    '别过来':
        'Đừng lại đây',

    '不要':
        'Đừng',

    '不许':
        'Không được',

    '别怕':
        'Đừng sợ',

    '放心':
        'Yên tâm',

    '小心':
        'Cẩn thận',

    '救命':
        'Cứu với',

    '救我':
        'Cứu tôi',

    '等等我':
        'Đợi tôi',

    '跟我来':
        'Đi theo tôi',

    '跟我走':
        'Đi theo tôi',

    '放开我':
        'Buông tôi ra',

    '放了我':
        'Tha cho tôi',

    '我错了':
        'Tôi sai rồi',

    '是吗':
        'Vậy sao',

    '好吧':
        'Được thôi',

    '好的':
        'Được',

    '知道了':
        'Biết rồi',

    '明白了':
        'Hiểu rồi'

};


const XIANXIA_DICTIONARY = {

    '师父':
        'Sư phụ',

    '师傅':
        'Sư phụ',

    '师尊':
        'Sư tôn',

    '徒弟':
        'Đồ đệ',

    '徒儿':
        'Đồ nhi',

    '弟子':
        'Đệ tử',

    '前辈':
        'Tiền bối',

    '晚辈':
        'Vãn bối',

    '师兄':
        'Sư huynh',

    '师姐':
        'Sư tỷ',

    '师弟':
        'Sư đệ',

    '师妹':
        'Sư muội',

    '长老':
        'Trưởng lão',

    '掌门':
        'Chưởng môn',

    '宗主':
        'Tông chủ',

    '宗门':
        'Tông môn',

    '门派':
        'Môn phái',

    '修炼':
        'Tu luyện',

    '修行':
        'Tu hành',

    '灵力':
        'Linh lực',

    '灵气':
        'Linh khí',

    '真气':
        'Chân khí',

    '法力':
        'Pháp lực',

    '修为':
        'Tu vi',

    '境界':
        'Cảnh giới',

    '突破':
        'Đột phá',

    '渡劫':
        'Độ kiếp',

    '飞升':
        'Phi thăng',

    '闭关':
        'Bế quan',

    '金丹':
        'Kim Đan',

    '元婴':
        'Nguyên Anh',

    '筑基':
        'Trúc Cơ',

    '炼气':
        'Luyện Khí',

    '化神':
        'Hóa Thần',

    '大乘':
        'Đại Thừa',

    '丹药':
        'Đan dược',

    '炼丹':
        'Luyện đan',

    '灵丹':
        'Linh đan',

    '法宝':
        'Pháp bảo',

    '灵器':
        'Linh khí',

    '神器':
        'Thần khí',

    '仙器':
        'Tiên khí',

    '仙术':
        'Tiên thuật',

    '功法':
        'Công pháp',

    '秘术':
        'Bí thuật',

    '魔尊':
        'Ma Tôn',

    '魔王':
        'Ma Vương',

    '妖王':
        'Yêu Vương',

    '妖兽':
        'Yêu thú',

    '魔族':
        'Ma tộc',

    '仙界':
        'Tiên giới',

    '魔界':
        'Ma giới',

    '凡界':
        'Phàm giới',

    '天道':
        'Thiên đạo',

    '大道':
        'Đại đạo',

    '因果':
        'Nhân quả',

    '心魔':
        'Tâm ma',

    '雷劫':
        'Lôi kiếp',

    '天劫':
        'Thiên kiếp',

    '灵石':
        'Linh thạch',

    '灵草':
        'Linh thảo',

    '秘境':
        'Bí cảnh',

    '遗迹':
        'Di tích',

    '传承':
        'Truyền thừa',

    '神识':
        'Thần thức',

    '元神':
        'Nguyên thần',

    '血脉':
        'Huyết mạch'

};


const ROMANCE_DICTIONARY = {

    '老公':
        'Chồng',

    '老婆':
        'Vợ',

    '丈夫':
        'Chồng',

    '妻子':
        'Vợ',

    '男朋友':
        'Bạn trai',

    '女朋友':
        'Bạn gái',

    '未婚夫':
        'Vị hôn phu',

    '未婚妻':
        'Vị hôn thê',

    '亲爱的':
        'Em yêu',

    '宝贝':
        'Cục cưng',

    '宝宝':
        'Bé yêu',

    '亲亲':
        'Hôn một cái',

    '爱你':
        'Yêu em / yêu anh',

    '我爱你':
        'Anh yêu em / Em yêu anh',

    '喜欢你':
        'Thích em / thích anh',

    '想你':
        'Nhớ em / nhớ anh',

    '想我吗':
        'Có nhớ tôi không',

    '吃醋':
        'Ghen',

    '心疼':
        'Đau lòng',

    '担心你':
        'Lo cho em / lo cho anh',

    '保护你':
        'Bảo vệ em / bảo vệ anh',

    '约会':
        'Hẹn hò',

    '告白':
        'Tỏ tình',

    '表白':
        'Tỏ tình',

    '分手':
        'Chia tay',

    '复合':
        'Quay lại',

    '结婚':
        'Kết hôn',

    '订婚':
        'Đính hôn',

    '想嫁给你':
        'Muốn gả cho anh',

    '想娶你':
        'Muốn cưới em',

    '陪着你':
        'Ở bên em',

    '陪我':
        'Ở bên tôi',

    '别离开我':
        'Đừng rời xa tôi',

    '不要离开我':
        'Đừng rời xa tôi',

    '你喜欢我吗':
        'Anh có thích em không',

    '你爱我吗':
        'Anh có yêu em không',

    '笨蛋':
        'Đồ ngốc',

    '傻瓜':
        'Đồ ngốc',

    '讨厌你':
        'Ghét anh / ghét em',

    '想抱你':
        'Muốn ôm em / ôm anh',

    '抱抱':
        'Ôm một cái',

    '亲一下':
        'Hôn một cái'

};


const DICTIONARIES = {

    normal:
        {
            ...COMMON_DICTIONARY
        },

    xianxia:
        {
            ...COMMON_DICTIONARY,
            ...XIANXIA_DICTIONARY
        },

    romance:
        {
            ...COMMON_DICTIONARY,
            ...ROMANCE_DICTIONARY
        }

};


/* =========================================================
   PROMPT / CONFIG
========================================================= */

function languageName(code) {

    const map = {

        'zh-CN':
            'Tiếng Trung',

        'en':
            'Tiếng Anh',

        'ja':
            'Tiếng Nhật',

        'ko':
            'Tiếng Hàn',

        'auto':
            'ngôn ngữ tự động nhận diện',

        'vi':
            'Tiếng Việt'

    };

    return map[code] || code;

}


function modeName(code) {

    const map = {

        natural:
            'Tự nhiên',

        literal:
            'Sát nghĩa',

        cinematic:
            'Vietsub phim',

        context:
            'Ưu tiên ngữ cảnh',

        short:
            'Short drama'

    };

    return map[code] || code;

}


function styleName(code) {

    const map = {

        natural:
            'Tự nhiên, đời thường',

        polite:
            'Lịch sự',

        casual:
            'Thân mật',

        dramatic:
            'Kịch tính',

        romance:
            'Tình cảm',

        xianxia:
            'Cổ phong / tu tiên',

        modern:
            'Hiện đại'

    };

    return map[code] || code;

}


function accuracyName(code) {

    const map = {

        fast:
            'Nhanh',

        balanced:
            'Cân bằng',

        high:
            'Cao',

        maximum:
            'Tối đa'

    };

    return map[code] || code;

}


function getAccuracyConfig() {

    const map = {

        fast: {

            thinking:
                'minimal',

            temperature:
                0.25,

            reasoning:
                'low'

        },

        balanced: {

            thinking:
                'medium',

            temperature:
                0.18,

            reasoning:
                'medium'

        },

        high: {

            thinking:
                'high',

            temperature:
                0.10,

            reasoning:
                'high'

        },

        maximum: {

            thinking:
                'high',

            temperature:
                0.05,

            reasoning:
                'max'

        }

    };

    return (
        map[accuracyLevel.value] ||
        map.balanced
    );

}


function loadPromptPreset() {

    if (
        promptPreset.value ===
        'custom'
    ) {
        return;
    }

    customPrompt.value =
        PROMPT_PRESETS[
            promptPreset.value
        ] ||
        PROMPT_PRESETS.natural;

}


// Chọn tối đa `limit` ví dụ từ bộ nhớ: ưu tiên các ví dụ có câu nguồn
// xuất hiện trong lượt đang dịch (liên quan nhất), sau đó mới lấy các
// ví dụ mới nhất để đủ số lượng.
function getMemoryExamples(limit = 20, items = []) {

    const haystack =
        (Array.isArray(items) ? items : [])
            .map(item => String(item && item.text != null ? item.text : ''))
            .join('\n');

    const picked = [];

    const pickedIndexes = new Set();

    if (haystack) {

        for (
            let i = translationMemory.length - 1;
            i >= 0 && picked.length < limit;
            i--
        ) {

            const entry = translationMemory[i];

            if (entry.source && haystack.includes(entry.source)) {

                picked.push(entry);

                pickedIndexes.add(i);

            }

        }

    }

    for (
        let i = translationMemory.length - 1;
        i >= 0 && picked.length < limit;
        i--
    ) {

        if (!pickedIndexes.has(i)) {
            picked.push(translationMemory[i]);
        }

    }

    return picked
        .reverse()
        .map(entry => ({
            source: entry.source,
            target: entry.target
        }));

}


function buildAIPrompt(items) {

    let instructions = customPrompt.value.trim();

    if (!instructions) {
        instructions = PROMPT_PRESETS.natural;
    }

    instructions =
        instructions
            .replaceAll('{{SOURCE_LANGUAGE}}', languageName(sourceLanguage.value))
            .replaceAll('{{TARGET_LANGUAGE}}', languageName(targetLanguage.value))
            .replaceAll('{{TRANSLATION_MODE}}', modeName(translationMode.value))
            .replaceAll('{{STYLE}}', styleName(translationStyle.value))
            .replaceAll('{{ACCURACY}}', accuracyName(accuracyLevel.value));

    const memory = getMemoryExamples(20, items);

    let memoryText = '';

    if (memory.length > 0) {

        memoryText = `

BỘ NHỚ DỊCH TỪ NGƯỜI DÙNG:

Các ví dụ dưới đây là bản dịch đã được người dùng chỉnh sửa hoặc nhập thủ công.
Hãy dùng chúng làm ví dụ về cách chọn từ, xưng hô, thuật ngữ và văn phong.
Không được sao chép máy móc nếu ngữ cảnh mới khác.

${JSON.stringify(memory)}

`;
    }

    return `
${instructions}

THÔNG TIN BẮT BUỘC:

Ngôn ngữ nguồn:
${languageName(sourceLanguage.value)}

Ngôn ngữ đích:
${languageName(targetLanguage.value)}

Chế độ dịch:
${modeName(translationMode.value)}

Văn phong:
${styleName(translationStyle.value)}

Độ chính xác:
${accuracyName(accuracyLevel.value)}

${memoryText}

QUY TẮC OUTPUT:

1. Chỉ trả về JSON.
2. JSON phải có dạng object:
   {"translations":[...]}
3. Giữ nguyên số lượng phần tử.
4. Không được bỏ dòng.
5. Không được thêm dòng.
6. Giữ nguyên id.
7. Chỉ thay đổi trường text.
8. Không thay đổi timestamp.
9. Không thêm Markdown.
10. Không thêm lời giải thích.
11. Không bọc bằng \`\`\`json.
12. Không đổi thứ tự id.
13. Nếu câu có tên riêng, số, ký hiệu hoặc thuật ngữ đặc biệt,
    phải giữ chính xác.
14. Không tự ý nối hai dòng thành một dòng.
15. Không tự ý tách một dòng thành nhiều dòng.

DỮ LIỆU:

${JSON.stringify(items)}

FORMAT BẮT BUỘC:

{
  "translations": [
    {
      "id": 0,
      "text": "Bản dịch"
    }
  ]
}

Chỉ trả về JSON object.
`.trim();

}


/* =========================================================
   STATUS
========================================================= */

function showStatus(
    element,
    message,
    type = ''
) {

    element.textContent =
        message;

    element.classList.remove(
        'hidden',
        'success',
        'error',
        'warning',
        'info'
    );

    if (type) {
        element.classList.add(
            type
        );
    }

}


/* =========================================================
   SLEEP
========================================================= */

function sleep(ms, signal) {

    return new Promise((resolve, reject) => {

        if (signal && signal.aborted) {

            reject(new DOMException('Aborted', 'AbortError'));

            return;

        }

        const onAbort = () => {

            clearTimeout(timer);

            reject(new DOMException('Aborted', 'AbortError'));

        };

        const timer = setTimeout(() => {

            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }

            resolve();

        }, ms);

        if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
        }

    });

}


/* =========================================================
   FETCH RETRY
========================================================= */

async function fetchWithRetry(
    url,
    options,
    attempts = 3,
    timeoutMs = 240000
) {

    const outer =
        translationAbortController
            ? translationAbortController.signal
            : null;

    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt++) {

        if (outer && outer.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const controller = new AbortController();

        const onOuterAbort = () => controller.abort();

        if (outer) {
            outer.addEventListener('abort', onOuterAbort, { once: true });
        }

        let timedOut = false;

        const timer = setTimeout(() => {

            timedOut = true;

            controller.abort();

        }, timeoutMs);

        let response = null;

        try {

            response = await fetch(
                url,
                {
                    ...options,
                    signal: controller.signal
                }
            );

        } catch (error) {

            // Người dùng chủ động dừng → báo AbortError cho nơi gọi.
            if (outer && outer.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            lastError =
                timedOut
                    ? new Error(
                        'Hết thời gian chờ phản hồi (' +
                        Math.round(timeoutMs / 1000) +
                        ' giây).'
                    )
                    : error;

        } finally {

            clearTimeout(timer);

            if (outer) {
                outer.removeEventListener('abort', onOuterAbort);
            }

        }

        let waitMs = 700 * Math.pow(2, attempt);

        if (response) {

            if (response.ok) {
                return response;
            }

            let message = 'HTTP ' + response.status;

            try {

                const errorData = await response.json();

                message =
                    (errorData && errorData.error &&
                        (errorData.error.message || errorData.error.code)) ||
                    (errorData && errorData.message) ||
                    message;

            } catch {}

            if (typeof message !== 'string') {
                message = JSON.stringify(message);
            }

            const retryable =
                response.status === 408 ||
                response.status === 409 ||
                response.status === 429 ||
                response.status >= 500;

            if (!retryable) {
                throw new Error(message);
            }

            lastError = new Error(message);

            const retryAfter =
                Number(response.headers.get('retry-after'));

            if (retryAfter > 0) {
                waitMs = Math.min(retryAfter * 1000, 20000);
            }

        }

        if (attempt < attempts - 1) {
            await sleep(waitMs, outer);
        }

    }

    throw (
        lastError ||
        new Error('API request thất bại.')
    );

}


/* =========================================================
   TIME
========================================================= */

function msToSrtTime(ms) {

    ms =
        Number(ms);

    if (
        !Number.isFinite(ms)
    ) {
        ms = 0;
    }

    ms =
        Math.max(
            0,
            Math.round(ms)
        );

    const hours =
        Math.floor(
            ms / 3600000
        );

    const minutes =
        Math.floor(
            (ms % 3600000) /
            60000
        );

    const seconds =
        Math.floor(
            (ms % 60000) /
            1000
        );

    const millis =
        ms % 1000;

    return (
        String(hours)
            .padStart(2, '0') +

        ':' +

        String(minutes)
            .padStart(2, '0') +

        ':' +

        String(seconds)
            .padStart(2, '0') +

        ',' +

        String(millis)
            .padStart(3, '0')
    );

}


/* =========================================================
   SRT
========================================================= */

// Chuẩn hóa nội dung 1 phụ đề: thống nhất xuống dòng, bỏ dòng trống
// (dòng trống làm vỡ block SRT) và khoảng trắng thừa cuối dòng.
function normalizeSubText(text) {

    return String(text == null ? '' : text)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.trim() !== '')
        .join('\n')
        .trim();

}


function subtitlesToSrt(list) {

    const out = new Array(list.length);

    for (let i = 0; i < list.length; i++) {

        const item = list[i];

        // Dòng nhập từ SRT mang theo số thứ tự, dòng timestamp thô và kiểu xuống dòng
        // của file gốc; dòng từ CapCut JSON không có nên cho kết quả như trước đây.
        const eol = item.eol || '\r\n';

        const num = Number.isInteger(item.num) ? item.num : i + 1;

        const stamp =
            item.tsLine ||
            (msToSrtTime(item.startMs) + ' --> ' + msToSrtTime(item.endMs));

        out[i] =
            num +
            eol +
            stamp +
            eol +
            normalizeSubText(item.text).replace(/\n/g, eol) +
            eol +
            eol;

    }

    return out.join('');

}


// Trả về NaN nếu timestamp sai định dạng để parseSrtText bỏ qua block lỗi
// (người dùng sẽ thấy cảnh báo lệch số block thay vì bị đổi thành 00:00:00).
function srtTimeToMs(text) {

    const match =
        String(text)
            .trim()
            .match(/^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})$/);

    if (!match) {
        return NaN;
    }

    return (
        Number(match[1]) * 3600000 +
        Number(match[2]) * 60000 +
        Number(match[3]) * 1000 +
        Number(match[4].padEnd(3, '0'))
    );

}


function parseSrtText(text) {

    const clean =
        String(text == null ? '' : text)
            .replace(/^\uFEFF/, '')
            .replace(/\r\n?/g, '\n')
            .trim();

    if (!clean) {
        return [];
    }

    // Dòng trống có thể chứa khoảng trắng khi người dùng sửa tay.
    const blocks = clean.split(/\n(?:[ \t]*\n)+/);

    const result = [];

    for (const block of blocks) {

        const lines =
            block
                .split('\n')
                .map(line => line.trimEnd());

        const arrowIndex =
            lines.findIndex(line => line.includes('-->'));

        if (arrowIndex === -1) {
            continue;
        }

        const times = lines[arrowIndex].split('-->');

        if (times.length !== 2) {
            continue;
        }

        const startMs = srtTimeToMs(times[0]);

        // Bỏ phần tọa độ/định dạng phía sau timestamp kết thúc nếu có.
        const endMs = srtTimeToMs(times[1].trim().split(/\s+/)[0]);

        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
            continue;
        }

        result.push({
            startMs,
            endMs,
            text: lines.slice(arrowIndex + 1).join('\n').trim()
        });

    }

    return result;

}


/* =========================================================
   FILE
========================================================= */

function formatFileSize(
    bytes
) {

    bytes =
        Number(bytes) || 0;

    if (
        bytes < 1024
    ) {
        return (
            bytes +
            ' B'
        );
    }

    if (
        bytes <
        1024 * 1024
    ) {

        return (
            (
                bytes /
                1024
            ).toFixed(1) +
            ' KB'
        );

    }

    return (
        (
            bytes /
            1024 /
            1024
        ).toFixed(2) +
        ' MB'
    );

}


/* =========================================================
   SELECT FILE
========================================================= */

function selectFile(file) {

    if (!file) {
        return;
    }

    // Đổi file khi đang dịch sẽ làm mảng subtitles bị thay giữa chừng.
    if (translationRunning) {

        showStatus(
            convertStatus,
            '⚠️ Đang dịch — hãy bấm “Dừng dịch” trước khi chọn file mới.',
            'warning'
        );

        return;

    }

    const name = String(file.name || '').trim();

    if (!name) {

        showStatus(
            convertStatus,
            '❌ Không đọc được tên file.',
            'error'
        );

        return;

    }

    const isSrt = isSrtFileName(name);

    if (!name.toLowerCase().endsWith('.json') && !isSrt) {

        showStatus(
            convertStatus,
            '❌ File phải có đuôi .json (CapCut) hoặc .srt.',
            'error'
        );

        return;

    }

    // Mở file mới thay toàn bộ bản đang làm: hỏi nếu còn chỉnh sửa chưa tải xuống.
    if (
        hasUnsavedWork() &&
        !window.confirm('Bạn còn chỉnh sửa / bản dịch chưa tải xuống. Mở file mới sẽ mất chúng. Tiếp tục?')
    ) {

        fileInput.value = '';

        return;

    }

    selectedFile = file;

    fileName.textContent = name;

    fileSize.textContent = formatFileSize(file.size);

    fileInfo.classList.remove('hidden');

    convertBtn.disabled = false;

    resetForNewSource();

    srtEncodingBox.classList.toggle('hidden', !isSrt);

    convertBtn.textContent = isSrt ? '📥 Nhập lại SRT' : '⚙️ Chuyển sang SRT';

    if (isSrt) {

        importSelectedSrt();

        return;

    }

    showStatus(
        convertStatus,
        '✅ Đã nhận file JSON: ' + name + '.',
        'success'
    );

}


/* =========================================================
   DRAG DROP
========================================================= */

let dragCounter = 0;


function setDragActive(
    active
) {

    dropZone.classList.toggle(
        'dragover',
        active
    );

}


function getDroppedFile(
    dataTransfer
) {

    if (!dataTransfer) {
        return null;
    }

    if (
        dataTransfer.files &&
        dataTransfer.files.length
    ) {
        return (
            dataTransfer.files[0]
        );
    }

    const items =
        dataTransfer.items;

    if (
        items &&
        items.length
    ) {

        for (
            let i = 0;
            i < items.length;
            i++
        ) {

            const item =
                items[i];

            if (
                item.kind !==
                'file'
            ) {
                continue;
            }

            const file =
                item.getAsFile();

            if (file) {
                return file;
            }

        }

    }

    return null;

}


document.addEventListener(
    'dragenter',
    event => {

        event.preventDefault();

        dragCounter++;

        setDragActive(true);

    }
);


document.addEventListener(
    'dragover',
    event => {

        event.preventDefault();

        if (
            event.dataTransfer
        ) {

            event.dataTransfer.dropEffect =
                'copy';

        }

        setDragActive(true);

    }
);


document.addEventListener(
    'dragleave',
    event => {

        event.preventDefault();

        dragCounter--;

        if (
            dragCounter <= 0
        ) {

            dragCounter = 0;

            setDragActive(
                false
            );

        }

    }
);


document.addEventListener(
    'drop',
    event => {

        event.preventDefault();

        dragCounter = 0;

        setDragActive(
            false
        );

        const file =
            getDroppedFile(
                event.dataTransfer
            );

        if (file) {
            selectFile(file);
        }

    }
);


dropZone.addEventListener(
    'keydown',
    event => {

        if (
            event.key === 'Enter' ||
            event.key === ' '
        ) {

            event.preventDefault();

            fileInput.click();

        }

    }
);


fileInput.addEventListener(
    'change',
    event => {

        const file =
            event.target
                ?.files
                ?.item(0);

        if (file) {
            selectFile(file);
        }

        setTimeout(
            () => {
                fileInput.value = '';
            },
            100
        );

    }
);


/* =========================================================
   PARSER
========================================================= */

function parseMaybeJSON(value) {

    let result =
        value;

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        if (
            typeof result !==
            'string'
        ) {
            break;
        }

        const text =
            result.trim();

        if (!text) {
            return null;
        }

        try {

            result =
                JSON.parse(
                    text
                );

        } catch {

            break;

        }

    }

    return result;

}


function getWordText(
    words,
    index
) {

    if (
        Array.isArray(
            words?.text
        )
    ) {

        return String(
            words.text[index] ??
            ''
        ).trim();

    }

    return '';

}


function extractWordTiming(
    words
) {

    let startMs =
        null;

    let endMs =
        null;

    if (
        words &&
        Array.isArray(
            words.start_time
        ) &&
        Array.isArray(
            words.end_time
        )
    ) {

        const count =
            Math.max(
                words.start_time.length,
                words.end_time.length
            );

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const text =
                getWordText(
                    words,
                    i
                );

            const start =
                Number(
                    words.start_time[i]
                );

            if (
                text &&
                Number.isFinite(
                    start
                )
            ) {

                startMs =
                    start;

                break;

            }

        }


        for (
            let i = count - 1;
            i >= 0;
            i--
        ) {

            const text =
                getWordText(
                    words,
                    i
                );

            const end =
                Number(
                    words.end_time[i]
                );

            if (
                text &&
                Number.isFinite(
                    end
                )
            ) {

                endMs =
                    end;

                break;

            }

        }

    }


    if (
        Array.isArray(
            words
        )
    ) {

        for (
            const word of words
        ) {

            if (
                !word ||
                typeof word !==
                'object'
            ) {
                continue;
            }

            const text =
                String(
                    word.text ??
                    ''
                ).trim();

            const start =
                Number(
                    word.start_time
                );

            if (
                text &&
                Number.isFinite(
                    start
                )
            ) {

                startMs =
                    start;

                break;

            }

        }


        for (
            let i =
                words.length - 1;
            i >= 0;
            i--
        ) {

            const word =
                words[i];

            if (
                !word ||
                typeof word !==
                'object'
            ) {
                continue;
            }

            const text =
                String(
                    word.text ??
                    ''
                ).trim();

            const end =
                Number(
                    word.end_time
                );

            if (
                text &&
                Number.isFinite(
                    end
                )
            ) {

                endMs =
                    end;

                break;

            }

        }

    }


    return {
        startMs,
        endMs
    };

}


function addSubtitle(
    result,
    seen,
    text,
    startMs,
    endMs
) {

    text =
        String(
            text ??
            ''
        ).trim();

    if (!text) {
        return;
    }

    startMs =
        Number(
            startMs
        );

    endMs =
        Number(
            endMs
        );

    if (
        !Number.isFinite(
            startMs
        )
    ) {
        startMs = 0;
    }

    if (
        !Number.isFinite(
            endMs
        )
    ) {
        endMs = 0;
    }

    if (
        endMs <= startMs
    ) {

        endMs =
            startMs + 1;

    }

    const key =
        Math.round(startMs) +
        '|' +
        Math.round(endMs) +
        '|' +
        text;

    if (
        seen.has(key)
    ) {
        return;
    }

    seen.add(key);

    result.push({

        text,

        startMs,

        endMs

    });

}


function processSentence(
    sentence,
    result,
    seen
) {

    if (
        !sentence ||
        typeof sentence !==
        'object'
    ) {
        return;
    }

    const text =
        String(
            sentence.text ??
            ''
        ).trim();

    if (!text) {
        return;
    }

    let startMs =
        Number(
            sentence.start_time
        );

    let endMs =
        Number(
            sentence.end_time
        );

    if (
        !Number.isFinite(
            startMs
        )
    ) {
        startMs = 0;
    }

    if (
        !Number.isFinite(
            endMs
        )
    ) {
        endMs = 0;
    }

    if (
        sentence.words !==
        undefined
    ) {

        const timing =
            extractWordTiming(
                sentence.words
            );

        if (
            timing.startMs !== null
        ) {
            startMs =
                timing.startMs;
        }

        if (
            timing.endMs !== null
        ) {
            endMs =
                timing.endMs;
        }

    }

    addSubtitle(
        result,
        seen,
        text,
        startMs,
        endMs
    );

}


function extractSubs(
    obj,
    result,
    seen
) {

    if (
        !obj ||
        typeof obj !==
        'object'
    ) {
        return;
    }

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                obj,
                'subtitle_cache_info'
            )
    ) {

        const cache =
            parseMaybeJSON(
                obj.subtitle_cache_info
            );

        if (
            cache &&
            typeof cache ===
            'object' &&
            Array.isArray(
                cache.sentence_list
            )
        ) {

            for (
                const sentence
                of cache.sentence_list
            ) {

                processSentence(
                    sentence,
                    result,
                    seen
                );

            }

        }

    }

    if (
        Array.isArray(
            obj
        )
    ) {

        for (
            const item of obj
        ) {

            extractSubs(
                item,
                result,
                seen
            );

        }

    } else {

        for (
            const value
            of Object.values(
                obj
            )
        ) {

            if (
                value &&
                typeof value ===
                'object'
            ) {

                extractSubs(
                    value,
                    result,
                    seen
                );

            }

        }

    }

}


/* =========================================================
   CONVERT
========================================================= */

async function convertFile() {

    if (!selectedFile) {

        showStatus(
            convertStatus,
            '⚠️ Chưa chọn file JSON hoặc SRT.',
            'warning'
        );

        return;

    }

    // Chuyển đổi lại khi đang dịch sẽ thay mảng subtitles giữa chừng.
    if (translationRunning) {

        showStatus(
            convertStatus,
            '⚠️ Đang dịch — hãy dừng dịch trước khi chuyển đổi lại.',
            'warning'
        );

        return;

    }

    if (
        hasUnsavedWork() &&
        !window.confirm('Bạn còn chỉnh sửa / bản dịch chưa tải xuống. Chuyển đổi / nhập lại sẽ mất chúng. Tiếp tục?')
    ) {

        return;

    }

    if (isSrtFileName(selectedFile.name)) {

        await importSelectedSrt();

        return;

    }

    convertBtn.disabled = true;

    try {

        showStatus(
            convertStatus,
            '⏳ Đang đọc file...',
            'warning'
        );

        let content = await selectedFile.text();

        content =
            content
                .replace(/^\uFEFF/, '')
                .trim();

        if (!content) {
            throw new Error('File JSON đang trống.');
        }

        showStatus(
            convertStatus,
            '⚙️ Đang phân tích phụ đề CapCut...',
            'warning'
        );

        const data = JSON.parse(content);

        const result = [];

        const seen = new Set();

        extractSubs(data, result, seen);

        result.sort((a, b) => a.startMs - b.startMs);

        subtitles = result;

        if (subtitles.length === 0) {

            throw new Error(
                'Không tìm thấy subtitle_cache_info / sentence_list.'
            );

        }

        originalSrt = subtitlesToSrt(subtitles);

        translatedSrt = '';

        translatedBaseline = [];

        translatedList = [];

        translatedSource = [];

        translatedDirty = false;

        srcDirty = false;

        trDirty = false;

        liteFlags = {};

        importedOriginal = null;

        importReport.classList.add('hidden');

        captureSourceBaseline();

        subtitleCount.textContent = subtitles.length;

        const last = subtitles[subtitles.length - 1];

        durationInfo.textContent =
            msToSrtTime(last.endMs).slice(0, 5);

        stats.classList.remove('hidden');

        translationSection.classList.remove('hidden');

        previewSection.classList.remove('hidden');

        downloadOriginalBtn.disabled = false;

        downloadTranslatedBtn.disabled = true;

        previewTranslatedBtn.disabled = true;

        learnEditedBtn.disabled = true;

        // Đồng bộ nội dung + trạng thái nút "SRT gốc / SRT đã dịch".
        showOriginalPreview();

        updateTranslationUI();

        showStatus(
            convertStatus,
            '✅ Đã chuyển ' +
            subtitles.length +
            ' dòng phụ đề sang SRT.',
            'success'
        );

    } catch (error) {

        showStatus(
            convertStatus,
            '❌ Lỗi: ' +
            (error?.message || 'Không xác định'),
            'error'
        );

    } finally {

        convertBtn.disabled = false;

    }

}


/* =========================================================
   API / PROVIDER UI
========================================================= */

function updateTranslationUI() {

    const method = translationMethod.value;

    const isAI =
        [
            'gemini',
            'groq',
            'deepseek',
            'openai',
            'openrouter'
        ].includes(method);

    aiPromptOptions.classList.toggle('hidden', !(isAI || method === 'literouter'));

    literouterOptions.classList.toggle('hidden', method !== 'literouter');

    geminiOptions.classList.toggle('hidden', method !== 'gemini');

    groqOptions.classList.toggle('hidden', method !== 'groq');

    deepseekOptions.classList.toggle('hidden', method !== 'deepseek');

    openaiOptions.classList.toggle('hidden', method !== 'openai');

    openrouterOptions.classList.toggle('hidden', method !== 'openrouter');

    builtinOptions.classList.toggle('hidden', method !== 'builtin');

    if (method === 'builtin') {

        sourceLanguage.value = 'zh-CN';

        targetLanguage.value = 'vi';

        sourceLanguage.disabled = true;

        targetLanguage.disabled = true;

    } else {

        sourceLanguage.disabled = false;

        targetLanguage.disabled = false;

    }

    translateBtn.disabled =
        method === 'none' ||
        subtitles.length === 0 ||
        translationRunning;

    if (method === 'none') {

        translatedSrt = '';

        translatedBaseline = [];

        translatedList = [];

        translatedSource = [];

        translatedDirty = false;

        trDirty = false;

        liteFlags = {};

        downloadTranslatedBtn.disabled = true;

        previewTranslatedBtn.disabled = true;

        showOriginalPreview();

    }

    liteRefreshResumeUI();

    updatePromptCounter();

    syncEditorLock();

    if (method === 'literouter') {

        liteProbe(false);

    }

}


translationMethod.addEventListener(
    'change',
    updateTranslationUI
);


/* =========================================================
   PROMPT EVENTS
========================================================= */

promptPreset.addEventListener(
    'change',
    () => {

        if (
            promptPreset.value !==
            'custom'
        ) {

            loadPromptPreset();

        }

    }
);


resetPromptBtn.addEventListener(
    'click',
    () => {

        loadPromptPreset();

        showStatus(
            translationStatus,
            '✅ Đã nạp lại prompt.',
            'success'
        );

    }
);


/* =========================================================
   GOOGLE
========================================================= */

async function googleTranslate(text, source, target) {

    const url =
        'https://translate.googleapis.com/translate_a/single' +
        '?client=gtx' +
        '&sl=' + encodeURIComponent(source) +
        '&tl=' + encodeURIComponent(target) +
        '&dt=t' +
        '&q=' + encodeURIComponent(text);

    // Mỗi dòng chỉ cần vài giây — timeout ngắn để không treo cả file.
    const response = await fetchWithRetry(url, {}, 3, 20000);

    const data = await response.json();

    if (!Array.isArray(data) || !Array.isArray(data[0])) {

        throw new Error(
            'Google Dịch trả về dữ liệu không hợp lệ.'
        );

    }

    return data[0]
        .map(item => item[0] || '')
        .join('');

}


/* =========================================================
   AI RESPONSE PARSER
========================================================= */

function cleanAIResponse(text) {

    // Một số model reasoning (Qwen, DeepSeek...) trả kèm khối <think>
    // chứa dấu { } làm hỏng việc tách JSON.
    let clean =
        String(text == null ? '' : text)
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .trim();

    clean =
        clean
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

    const firstObject = clean.indexOf('{');

    const lastObject = clean.lastIndexOf('}');

    const firstArray = clean.indexOf('[');

    const lastArray = clean.lastIndexOf(']');

    if (firstObject !== -1 && lastObject > firstObject) {
        return clean.slice(firstObject, lastObject + 1);
    }

    if (firstArray !== -1 && lastArray > firstArray) {
        return clean.slice(firstArray, lastArray + 1);
    }

    return clean;

}


function parseAIResult(text) {

    const clean = cleanAIResponse(text);

    let parsed;

    try {

        parsed = JSON.parse(clean);

    } catch {

        // JSON bị cắt giữa chừng (hết token) hoặc lỗi cú pháp nhỏ:
        // nhặt các object {"id":..,"text":".."} còn nguyên thay vì bỏ cả lượt.
        const salvaged = [];

        const pattern =
            /\{\s*"id"\s*:\s*(-?\d+)\s*,\s*"text"\s*:\s*("(?:[^"\\]|\\[\s\S])*")\s*\}/g;

        let match;

        while ((match = pattern.exec(clean)) !== null) {

            try {

                salvaged.push({
                    id: Number(match[1]),
                    text: JSON.parse(match[2])
                });

            } catch {}

        }

        if (salvaged.length) {
            return salvaged;
        }

        throw new Error('AI trả về JSON không hợp lệ.');

    }

    if (Array.isArray(parsed)) {
        return parsed;
    }

    if (parsed && Array.isArray(parsed.translations)) {
        return parsed.translations;
    }

    throw new Error('AI không trả về translations array.');

}


function applyAITranslations(translatedTexts, result, validIds) {

    if (!Array.isArray(result)) {
        return 0;
    }

    const validSet = new Set(validIds);

    const used = new Set();

    let count = 0;

    const take = (id, raw) => {

        const text = String(raw == null ? '' : raw).trim();

        if (!validSet.has(id) || used.has(id) || !text) {
            return;
        }

        translatedTexts[id] = text;

        used.add(id);

        count++;

    };

    for (const item of result) {

        if (item && typeof item === 'object') {
            take(Number(item.id), item.text);
        }

    }

    // Model bỏ/đổi id nhưng trả đúng số phần tử theo thứ tự → ghép theo vị trí.
    if (count === 0 && result.length === validIds.length) {

        result.forEach((item, index) => {

            take(
                validIds[index],
                typeof item === 'string'
                    ? item
                    : (item && item.text)
            );

        });

    }

    return count;

}


/* =========================================================
   GEMINI
========================================================= */

function getGeminiConfig(
    model
) {

    const accuracy =
        getAccuracyConfig();

    let thinking =
        geminiThinking.value;

    if (
        thinking ===
        'auto'
    ) {

        thinking =
            accuracy.thinking;

    }

    if (
        model.startsWith(
            'gemini-3'
        )
    ) {

        // Gemini 3 Pro models chỉ hỗ trợ 2 mức low/high
        // (Flash mới hỗ trợ đủ minimal/low/medium/high).
        if (
            model.includes('pro') &&
            thinking !== 'high'
        ) {

            thinking = 'low';

        }

        return {

            thinkingConfig: {

                thinkingLevel:
                    thinking

            }

        };

    }

    if (
        model.startsWith(
            'gemini-2.5'
        )
    ) {

        const budgetMap = {

            fast:
                512,

            balanced:
                2048,

            high:
                4096,

            maximum:
                8192

        };

        return {

            thinkingConfig: {

                thinkingBudget:
                    budgetMap[
                        accuracyLevel.value
                    ] || 2048

            },

            temperature:
                accuracy.temperature

        };

    }

    return {};

}


async function geminiTranslateBatch(items, apiKey, model) {

    model = String(model || '').trim();

    if (!model) {
        throw new Error('Ông chưa nhập model Gemini.');
    }

    const prompt = buildAIPrompt(items);

    const url =
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(model) +
        ':generateContent';

    const config = getGeminiConfig(model);

    const send = generationExtra =>
        fetchWithRetry(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        ...generationExtra
                    }
                })
            },
            3,
            240000
        );

    let response;

    try {

        response = await send(config);

    } catch (error) {

        // Model không hỗ trợ thinkingConfig/temperature (tuỳ model, tuỳ thời
        // điểm) → thử lại đúng 1 lần với cấu hình tối giản thay vì hỏng lượt.
        if (
            error &&
            error.name !== 'AbortError' &&
            Object.keys(config).length > 0 &&
            /thinking|temperature|unsupported/i.test(String(error.message))
        ) {

            response = await send({});

        } else {

            throw error;

        }

    }

    const data = await response.json();

    const candidate = data && data.candidates && data.candidates[0];

    const text =
        candidate && candidate.content && candidate.content.parts
            ? candidate.content.parts.map(part => part.text || '').join('')
            : '';

    if (!text) {

        throw new Error(
            (data && data.promptFeedback && data.promptFeedback.blockReason) ||
            (candidate && candidate.finishReason) ||
            'Gemini không trả về nội dung.'
        );

    }

    return parseAIResult(text);

}


/* =========================================================
   GENERIC OPENAI-COMPATIBLE
========================================================= */

async function compatibleTranslateBatch(items, config) {

    config.model = String(config.model || '').trim();

    if (!config.model) {
        throw new Error('Ông chưa nhập tên model.');
    }

    const prompt = buildAIPrompt(items);

    const tokenLimit =
        Math.min(
            60000,
            Math.max(
                1600,
                items.length * 140
            )
        );

    // Xây body theo từng lần thử — opts cho phép lần thử lại
    // (fallback) bỏ bớt các tham số mà model/provider không hỗ trợ,
    // thay vì làm hỏng luôn cả lượt dịch.
    function buildBody(opts) {

        const body = {

            model: config.model,

            messages: [

                {
                    role: 'system',
                    content:
                        'Bạn là chuyên gia dịch phụ đề phim. Hãy tuân thủ tuyệt đối định dạng JSON và các quy tắc dịch được cung cấp.'
                },

                {
                    role: 'user',
                    content: prompt
                }

            ]

        };

        // Các model reasoning thật của OpenAI (Chat Completions) chỉ
        // chấp nhận max_completion_tokens, không phải max_tokens.
        if (config.useMaxCompletionTokens) {
            body.max_completion_tokens = tokenLimit;
        } else {
            body.max_tokens = tokenLimit;
        }

        if (
            config.temperature !== undefined &&
            !opts.dropTemperature
        ) {
            body.temperature = config.temperature;
        }

        if (
            config.reasoning_effort &&
            !opts.dropReasoning
        ) {
            body.reasoning_effort = config.reasoning_effort;
        }

        if (config.responseFormat) {

            body.response_format = {
                type: 'json_object'
            };

        }

        return body;

    }

    function looksLikeUnsupportedParamError(message) {

        message = String(message || '').toLowerCase();

        return (
            message.includes('reasoning_effort') ||
            message.includes('reasoning.effort') ||
            message.includes('temperature') ||
            (
                message.includes('unsupported') &&
                (
                    message.includes('parameter') ||
                    message.includes('value')
                )
            ) ||
            message.includes('unknown parameter') ||
            message.includes('unrecognized request argument') ||
            (
                message.includes('invalid') &&
                message.includes('effort')
            )
        );

    }

    function callApi(opts) {

        return fetchWithRetry(
            config.endpoint,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + config.apiKey,
                    ...(config.extraHeaders || {})
                },

                body: JSON.stringify(buildBody(opts))
            },
            3
        );

    }

    let response;

    try {

        response = await callApi({});

    } catch (error) {

        const hasOptionalParams =
            Boolean(config.reasoning_effort) ||
            config.temperature !== undefined;

        // Nếu model/provider từ chối reasoning_effort hoặc
        // temperature (tuỳ model, tuỳ thời điểm — các hãng đổi
        // liên tục), thử lại đúng 1 lần mà không có 2 tham số đó
        // thay vì làm cả lượt (và cả các dòng khác trong lượt) lỗi.
        if (
            error?.name !== 'AbortError' &&
            hasOptionalParams &&
            looksLikeUnsupportedParamError(error?.message)
        ) {

            response = await callApi({
                dropReasoning: true,
                dropTemperature: true
            });

        } else {

            throw error;

        }

    }

    const data = await response.json();

    const choice = data?.choices?.[0];

    let content = choice?.message?.content;

    if (Array.isArray(content)) {

        content =
            content
                .map(item =>
                    typeof item === 'string'
                        ? item
                        : item?.text || ''
                )
                .join('');

    }

    if (!content) {

        throw new Error(
            data?.error?.message ||
            (
                choice?.finish_reason === 'length'
                    ? 'Model hết token trước khi trả kết quả — hãy giảm "Số dòng / lượt" hoặc hạ Reasoning.'
                    : 'Model không trả về nội dung.'
            )
        );

    }

    return parseAIResult(content);

}


/* =========================================================
   PROVIDER DISPATCH
========================================================= */

// Xóa mọi khoảng trắng / ký tự vô hình khi dán API key từ điện thoại.
function cleanKey(value) {

    return String(value == null ? '' : value)
        .replace(/[\s\u200B-\u200D\uFEFF]+/g, '');

}


async function translateAIBatchOnce(items, method) {

    const accuracy = getAccuracyConfig();

    if (method === 'gemini') {

        const key = cleanKey(geminiKey.value);

        if (!key) {
            throw new Error('Ông chưa nhập Gemini API Key.');
        }

        return geminiTranslateBatch(
            items,
            key,
            String(geminiModel.value).trim()
        );

    }


    if (method === 'groq') {

        const key = cleanKey(groqKey.value);

        if (!key) {
            throw new Error('Ông chưa nhập Groq API Key.');
        }

        return compatibleTranslateBatch(
            items,
            {
                endpoint: 'https://api.groq.com/openai/v1/chat/completions',

                apiKey: key,

                model: String(groqModel.value).trim(),

                temperature: accuracy.temperature,

                reasoning_effort:
                    accuracy.reasoning === 'max'
                        ? 'high'
                        : accuracy.reasoning,

                responseFormat: true
            }
        );

    }


    if (method === 'deepseek') {

        const key = cleanKey(deepseekKey.value);

        if (!key) {
            throw new Error('Ông chưa nhập DeepSeek API Key.');
        }

        let reasoning = deepseekReasoning.value;

        if (reasoning === 'auto') {
            reasoning = accuracy.reasoning;
        }

        return compatibleTranslateBatch(
            items,
            {
                endpoint: 'https://api.deepseek.com/chat/completions',

                apiKey: key,

                model: String(deepseekModel.value).trim(),

                reasoning_effort: reasoning,

                temperature: accuracy.temperature,

                responseFormat: true
            }
        );

    }


    if (method === 'openai') {

        const key = cleanKey(openaiKey.value);

        if (!key) {
            throw new Error('Ông chưa nhập OpenAI API Key.');
        }

        let reasoning = openaiReasoning.value;

        if (reasoning === 'auto') {
            reasoning = accuracy.reasoning;
        }

        return compatibleTranslateBatch(
            items,
            {
                endpoint: 'https://api.openai.com/v1/chat/completions',

                apiKey: key,

                model: String(openaiModel.value).trim(),

                reasoning_effort: reasoning,

                useMaxCompletionTokens: true,

                responseFormat: true
            }
        );

    }


    if (method === 'openrouter') {

        const key = cleanKey(openrouterKey.value);

        if (!key) {
            throw new Error('Ông chưa nhập OpenRouter API Key.');
        }

        const model = openrouterModel.value.trim();

        if (!model) {
            throw new Error('Ông chưa nhập model OpenRouter.');
        }

        return compatibleTranslateBatch(
            items,
            {
                endpoint: 'https://openrouter.ai/api/v1/chat/completions',

                apiKey: key,

                model: model,

                temperature: accuracy.temperature,

                responseFormat: false,

                extraHeaders: {
                    'X-Title': 'LaySRT'
                }
            }
        );

    }


    throw new Error('Provider AI không được hỗ trợ.');

}


// Gọi AI cho 1 lượt; nếu model chỉ trả về một phần số dòng thì tự yêu cầu
// lại đúng 1 lần cho các dòng còn thiếu. Luôn trả về mảng {id, text} theo
// id hợp lệ, nên vòng lặp dịch bên dưới không cần biết chuyện này.
async function translateAIBatch(items, method) {

    const ids = items.map(item => item.id);

    const got = {};

    applyAITranslations(
        got,
        await translateAIBatchOnce(items, method),
        ids
    );

    const missing = items.filter(item => !got[item.id]);

    if (missing.length > 0 && missing.length < items.length) {

        try {

            applyAITranslations(
                got,
                await translateAIBatchOnce(missing, method),
                missing.map(item => item.id)
            );

        } catch (error) {

            if (error && error.name === 'AbortError') {
                throw error;
            }

        }

    }

    return ids
        .filter(id => got[id])
        .map(id => ({
            id: id,
            text: got[id]
        }));

}


/* =========================================================
   BUILTIN DICTIONARY
========================================================= */

function escapeRegExp(text) {

    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );

}


function translateBuiltinText(
    text,
    category
) {

    let result =
        String(
            text ??
            ''
        );

    const dictionary =
        DICTIONARIES[
            category
        ] ||
        DICTIONARIES.normal;

    const keys =
        Object.keys(
            dictionary
        ).sort(
            (
                a,
                b
            ) =>
                b.length -
                a.length
        );

    let replacements = 0;

    for (
        const key of keys
    ) {

        if (
            !result.includes(key)
        ) {
            continue;
        }

        const pattern =
            new RegExp(
                escapeRegExp(key),
                'g'
            );

        result =
            result.replace(
                pattern,
                () => {

                    replacements++;

                    return dictionary[
                        key
                    ];

                }
            );

    }

    return {

        text:
            result,

        replacements

    };

}


/* =========================================================
   TRANSLATE
========================================================= */

async function translateSubtitles() {

    if (translationRunning) {
        return;
    }

    if (subtitles.length === 0) {
        return;
    }

    const method = translationMethod.value;

    if (method === 'none') {
        return;
    }

    if (
        method === 'literouter' &&
        liteBrief().length > LITE.maxPromptChars
    ) {

        showStatus(
            translationStatus,
            '❌ Prompt dài ' + liteBrief().length + ' ký tự, tối đa ' + LITE.maxPromptChars +
            ' ký tự cho LiteRouter. Hãy rút gọn prompt.',
            'error'
        );

        return;

    }

    // Ghi nốt ô đang gõ ở trình sửa trước khi chụp dữ liệu.
    flushEditor();

    if (method !== 'literouter') {

        liteFlags = {};

    }

    // Chụp mảng phụ đề tại thời điểm bắt đầu dịch.
    const subs = subtitles;

    translationRunning = true;

    syncEditorLock();

    // Khóa các điều khiển có thể làm hỏng lượt dịch đang chạy
    // (đổi phương thức làm xóa bản dịch, chuyển đổi lại thay mảng phụ đề).
    translationMethod.disabled = true;

    convertBtn.disabled = true;

    translationAbortController = new AbortController();

    translateBtn.disabled = true;

    downloadTranslatedBtn.disabled = true;

    previewTranslatedBtn.disabled = true;

    learnEditedBtn.disabled = true;

    stopTranslateBtn.disabled = false;

    stopTranslateBtn.classList.remove('hidden');

    progressWrapper.classList.remove('hidden');

    progressFill.style.width = '0%';

    progressText.textContent = 'Đang chuẩn bị...';

    // wasAborted: người dùng bấm "Dừng dịch".
    // fatalError: nhiều lượt/dòng liên tiếp lỗi — dừng sớm thay vì
    // tiếp tục gọi API thất bại hàng loạt, tốn quota vô ích.
    // Dù dừng vì lý do gì, những dòng đã dịch được trước đó vẫn
    // được giữ lại thay vì mất trắng như trước.
    let wasAborted = false;

    let fatalError = null;

    let liteOutcome = null;

    try {

        const translatedTexts = new Array(subs.length);

        const source = sourceLanguage.value;

        const target = targetLanguage.value;

        /* =================================================
           GOOGLE
        ================================================== */

        if (method === 'google') {

            let consecutiveFailures = 0;

            for (let i = 0; i < subs.length; i++) {

                showStatus(
                    translationStatus,
                    '🌐 Google Dịch dòng ' +
                    (i + 1) +
                    '/' +
                    subs.length +
                    '...',
                    'warning'
                );

                try {

                    translatedTexts[i] =
                        await googleTranslate(
                            subs[i].text,
                            source,
                            target
                        );

                    consecutiveFailures = 0;

                    if (i < subs.length - 1) {

                        // Nghỉ một chút giữa các dòng để giảm nguy cơ
                        // bị Google giới hạn tốc độ khi file rất dài.
                        await sleep(
                            60,
                            translationAbortController?.signal
                        );

                    }

                } catch (error) {

                    if (error?.name === 'AbortError') {

                        wasAborted = true;

                        break;

                    }

                    consecutiveFailures++;

                    if (consecutiveFailures >= 5) {

                        fatalError = error;

                        break;

                    }

                }

                const percent =
                    Math.round(
                        ((i + 1) / subs.length) * 100
                    );

                progressFill.style.width = percent + '%';

                progressText.textContent = percent + '%';

            }

        }


        /* =================================================
           AI PROVIDERS
        ================================================== */

        else if (
            [
                'gemini',
                'groq',
                'deepseek',
                'openai',
                'openrouter'
            ].includes(method)
        ) {

            const size = Number(batchSize.value);

            const total = Math.ceil(subs.length / size);

            let consecutiveFailures = 0;

            const providerName = {
                gemini: 'Gemini',
                groq: 'Groq',
                deepseek: 'DeepSeek',
                openai: 'OpenAI',
                openrouter: 'OpenRouter'
            }[method];

            for (
                let batchIndex = 0;
                batchIndex < total;
                batchIndex++
            ) {

                const start = batchIndex * size;

                const batch = subs.slice(start, start + size);

                const input =
                    batch.map(
                        (item, index) => ({
                            id: start + index,
                            text: item.text
                        })
                    );

                showStatus(
                    translationStatus,
                    '🤖 ' +
                    providerName +
                    ' đang dịch lượt ' +
                    (batchIndex + 1) +
                    '/' +
                    total +
                    ' (' +
                    batch.length +
                    ' dòng)...',
                    'warning'
                );

                try {

                    const result =
                        await translateAIBatch(
                            input,
                            method
                        );

                    const count =
                        applyAITranslations(
                            translatedTexts,
                            result,
                            input.map(item => item.id)
                        );

                    if (count < input.length) {

                        showStatus(
                            translationStatus,
                            '⚠️ ' +
                            providerName +
                            ' trả thiếu ' +
                            (input.length - count) +
                            ' dòng ở lượt này. Các dòng thiếu sẽ giữ nguyên.',
                            'warning'
                        );

                    }

                    consecutiveFailures = 0;

                } catch (error) {

                    if (error?.name === 'AbortError') {

                        wasAborted = true;

                        break;

                    }

                    consecutiveFailures++;

                    showStatus(
                        translationStatus,
                        '⚠️ Lượt ' +
                        (batchIndex + 1) +
                        '/' +
                        total +
                        ' lỗi (' +
                        (error?.message || 'không xác định') +
                        ') — giữ nguyên bản gốc cho ' +
                        batch.length +
                        ' dòng này.',
                        'warning'
                    );

                    // 2 lượt liên tiếp cùng lỗi thường là do sai API
                    // key / tên model chứ không phải trục trặc tạm
                    // thời — dừng sớm thay vì lặp lại lỗi cho hết file.
                    if (consecutiveFailures >= 2) {

                        fatalError = error;

                        break;

                    }

                }

                const percent =
                    Math.round(
                        (
                            Math.min(
                                start + batch.length,
                                subs.length
                            ) / subs.length
                        ) * 100
                    );

                progressFill.style.width = percent + '%';

                progressText.textContent = percent + '%';

            }

        }


        /* =================================================
           LITEROUTER (qua /api/translate)
        ================================================== */

        else if (method === 'literouter') {

            liteOutcome = await runLiteRouterJob(
                subs,
                translatedTexts,
                translationAbortController.signal
            );

            wasAborted = liteOutcome.wasAborted;

            fatalError = liteOutcome.fatalError;

        }


        /* =================================================
           BUILTIN
        ================================================== */

        else if (method === 'builtin') {

            let totalReplacements = 0;

            let changedLines = 0;

            for (let i = 0; i < subs.length; i++) {

                const result =
                    translateBuiltinText(
                        subs[i].text,
                        activeDictionary
                    );

                translatedTexts[i] = result.text;

                totalReplacements += result.replacements;

                if (result.text !== subs[i].text) {
                    changedLines++;
                }

                const percent =
                    Math.round(
                        ((i + 1) / subs.length) * 100
                    );

                progressFill.style.width = percent + '%';

                progressText.textContent = percent + '%';

                showStatus(
                    translationStatus,
                    '📚 Đang tra từ điển dòng ' +
                    (i + 1) +
                    '/' +
                    subs.length +
                    '...',
                    'warning'
                );

                if (i % 25 === 0) {
                    await sleep(0);
                }

            }

            showStatus(
                translationStatus,
                '✅ Dịch từ điển xong. Đã thay ' +
                totalReplacements +
                ' từ/cụm trong ' +
                changedLines +
                ' dòng.',
                'success'
            );

        }


        /* =================================================
           ĐẾM SỐ DÒNG CHƯA DỊCH ĐƯỢC (trước khi fallback)
        ================================================== */

        let missingCount = 0;

        for (let i = 0; i < subs.length; i++) {

            if (!translatedTexts[i] && subs[i].text) {
                missingCount++;
            }

        }


        /* =================================================
           FALLBACK
        ================================================== */

        for (let i = 0; i < subs.length; i++) {

            if (!translatedTexts[i]) {
                translatedTexts[i] = subs[i].text;
            }

        }


        /* =================================================
           OUTPUT — luôn ghép SRT từ những gì đã dịch được,
           kể cả khi bị dừng giữa chừng hoặc có lỗi, thay vì
           mất hết nếu có sự cố ở giữa file dài.
        ================================================== */

        // Mốc bản dịch gốc để "Học từ bản dịch đã sửa" so sánh.
        translatedBaseline = translatedTexts.map(normalizeSubText);

        // Bản đang sửa (giữ lại các dòng người dùng đã sửa tay khi LiteRouter chỉ dịch tiếp phần còn lại).
        translatedList = translatedBaseline.slice();

        if (liteOutcome && liteOutcome.userEdits) {

            for (const key of Object.keys(liteOutcome.userEdits)) {

                translatedList[Number(key)] = liteOutcome.userEdits[key];

            }

        }

        translatedSource = subs.map(item => item.text);

        trDirty = missingCount < subs.length;

        rebuildTranslatedSrt();

        downloadTranslatedBtn.disabled = false;

        previewTranslatedBtn.disabled = false;

        // Chuyển sang xem bản dịch và đồng bộ trạng thái các nút xem trước.
        showTranslatedPreview();


        /* =================================================
           STATUS — builtin đã tự báo trạng thái riêng ở trên.
        ================================================== */

        if (method !== 'builtin') {

            if (wasAborted) {

                progressText.textContent = 'Đã dừng';

                showStatus(
                    translationStatus,
                    '⛔ Đã dừng dịch.' +
                    (
                        missingCount > 0
                            ? ' Đã giữ bản dịch cho các dòng hoàn thành, ' +
                              missingCount +
                              ' dòng còn lại giữ nguyên bản gốc.'
                            : ' Đã dịch xong trước khi dừng.'
                    ),
                    'warning'
                );

            } else if (fatalError) {

                progressText.textContent = 'Dừng do lỗi lặp lại';

                showStatus(
                    translationStatus,
                    '❌ Dừng dịch sớm do lỗi lặp lại nhiều lần (' +
                    (fatalError?.message || 'không xác định') +
                    '). Đã giữ bản dịch cho các dòng hoàn thành, ' +
                    missingCount +
                    '/' +
                    subs.length +
                    (
                        method === 'literouter'
                            ? ' dòng còn lại giữ nguyên bản gốc — hãy bấm “Tiếp tục dịch” (phần đã dịch được lưu sẵn).'
                            : ' dòng còn lại giữ nguyên bản gốc — kiểm tra lại API key / tên model rồi dịch lại nếu cần.'
                    ),
                    'error'
                );

            } else if (missingCount > 0) {

                progressFill.style.width = '100%';

                progressText.textContent = '100% — Hoàn thành (có lỗi)';

                showStatus(
                    translationStatus,
                    '✅ Đã dịch xong nhưng ' +
                    missingCount +
                    ' dòng bị lỗi và giữ nguyên bản gốc. Ông có thể sửa trực tiếp rồi cho web học.',
                    'warning'
                );

            } else {

                progressFill.style.width = '100%';

                progressText.textContent = '100% — Hoàn thành';

                showStatus(
                    translationStatus,
                    '✅ Đã dịch xong ' +
                    subs.length +
                    ' dòng. Ông có thể sửa trực tiếp rồi cho web học.',
                    'success'
                );

            }

        }

        if (method === 'literouter') {

            const suffix = liteStatusSuffix();

            if (suffix) {

                translationStatus.textContent += suffix;

            }

        }

    } catch (error) {

        if (error?.name === 'AbortError') {

            showStatus(
                translationStatus,
                '⛔ Đã dừng dịch.',
                'warning'
            );

        } else {

            showStatus(
                translationStatus,
                '❌ Dịch lỗi: ' +
                (error?.message || 'Không xác định'),
                'error'
            );

        }

    } finally {

        translationRunning = false;

        translationAbortController = null;

        translationMethod.disabled = false;

        convertBtn.disabled = !selectedFile;

        stopTranslateBtn.classList.add('hidden');

        updateTranslationUI();

    }

}


/* =========================================================
   MEMORY STORAGE
========================================================= */

function normalizeMemoryText(
    text
) {

    return String(
        text ??
        ''
    ).trim();

}


function loadMemory() {

    try {

        const raw =
            localStorage.getItem(
                MEMORY_KEY
            );

        const parsed =
            raw
                ? JSON.parse(raw)
                : [];

        if (
            !Array.isArray(
                parsed
            )
        ) {

            translationMemory =
                [];

        } else {

            translationMemory =
                parsed
                    .filter(
                        item =>
                            item &&
                            item.source &&
                            item.target
                    )
                    .map(
                        item => ({

                            source:
                                normalizeMemoryText(
                                    item.source
                                ),

                            target:
                                normalizeMemoryText(
                                    item.target
                                ),

                            createdAt:
                                item.createdAt ||
                                Date.now()

                        })
                    )
                    .slice(
                        -1000
                    );

        }

    } catch {

        translationMemory =
            [];

    }

    updateMemoryUI();

}


function saveMemory() {

    try {

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(
                translationMemory
            )
        );

    } catch {

        showStatus(
            translationStatus,
            '⚠️ Không thể lưu bộ nhớ trên trình duyệt.',
            'warning'
        );

    }

    updateMemoryUI();

}


function updateMemoryUI() {

    const count =
        translationMemory.length;

    memoryBadge.textContent =
        count +
        ' ví dụ';

    memoryCountStat.textContent =
        count;

}


function addMemoryPair(
    source,
    target
) {

    source =
        normalizeMemoryText(
            source
        );

    target =
        normalizeMemoryText(
            target
        );

    if (
        !source ||
        !target
    ) {
        return false;
    }

    const existingIndex =
        translationMemory.findIndex(
            item =>
                item.source ===
                source
        );

    const data = {

        source,

        target,

        createdAt:
            Date.now()

    };

    if (
        existingIndex !== -1
    ) {

        translationMemory[
            existingIndex
        ] =
            data;

    } else {

        translationMemory.push(
            data
        );

    }

    if (
        translationMemory.length >
        1000
    ) {

        translationMemory =
            translationMemory.slice(
                -1000
            );

    }

    return true;

}


/* =========================================================
   MEMORY MANUAL INPUT
========================================================= */

function parseMemoryLines(
    text
) {

    const lines =
        String(
            text ?? ''
        )
            .split('\n')
            .map(
                line =>
                    line.trim()
            )
            .filter(Boolean);

    const pairs = [];

    for (
        const line of lines
    ) {

        let index =
            line.indexOf(
                '=>'
            );

        if (
            index === -1
        ) {

            index =
                line.indexOf(
                    '→'
                );

        }

        if (
            index === -1
        ) {
            continue;
        }

        const source =
            line
                .slice(
                    0,
                    index
                )
                .trim();

        const target =
            line
                .slice(
                    index +
                    (
                        line[index] ===
                        '→'
                            ? 1
                            : 2
                    )
                )
                .trim();

        if (
            source &&
            target
        ) {

            pairs.push({

                source,

                target

            });

        }

    }

    return pairs;

}


saveMemoryBtn.addEventListener(
    'click',
    () => {

        const pairs =
            parseMemoryLines(
                memoryInput.value
            );

        if (
            pairs.length ===
            0
        ) {

            showStatus(
                translationStatus,
                '⚠️ Không tìm thấy cặp source => target hợp lệ.',
                'warning'
            );

            return;

        }

        let count = 0;

        for (
            const pair of pairs
        ) {

            if (
                addMemoryPair(
                    pair.source,
                    pair.target
                )
            ) {

                count++;

            }

        }

        saveMemory();

        memoryInput.value =
            '';

        showStatus(
            translationStatus,
            '✅ Đã lưu ' +
            count +
            ' ví dụ vào bộ nhớ dịch.',
            'success'
        );

    }
);


/* =========================================================
   LEARN FROM EDITED SRT
========================================================= */

function parseCurrentPreviewAsSrt() {

    return parseSrtText(
        preview.value
    );

}


function learnFromEditedSrt() {

    if (previewMode !== 'translated') {

        showStatus(
            translationStatus,
            '⚠️ Hãy mở SRT đã dịch trước.',
            'warning'
        );

        return;

    }

    flushEditor();

    if (translatedList.length !== subtitles.length) {

        showStatus(
            translationStatus,
            '❌ Số dòng bản dịch (' +
            translatedList.length +
            ') không khớp số phụ đề gốc (' +
            subtitles.length +
            ').',
            'error'
        );

        return;

    }

    let learned = 0;

    let changed = 0;

    // So với bản dịch gốc của máy/AI (mốc không đổi khi sửa hay tải file),
    // nên không bao giờ báo nhầm "chưa có thay đổi".
    for (let i = 0; i < subtitles.length; i++) {

        const target = translatedList[i];

        if (!target) {
            continue;
        }

        const oldTarget = translatedBaseline[i] || '';

        if (target !== oldTarget) {

            changed++;

            if (addMemoryPair(subtitles[i].text, target)) {
                learned++;
            }

        }

    }

    if (learned > 0) {

        saveMemory();

        showStatus(
            translationStatus,
            '🧠 Đã học ' +
            learned +
            ' cặp từ/câu từ bản dịch ông vừa sửa.',
            'success'
        );

    } else if (changed === 0) {

        showStatus(
            translationStatus,
            'ℹ️ Chưa có dòng nào thay đổi so với bản dịch hiện tại.',
            'info'
        );

    } else {

        showStatus(
            translationStatus,
            'ℹ️ Không có cặp mới để lưu.',
            'info'
        );

    }

}


learnEditedBtn.addEventListener(
    'click',
    learnFromEditedSrt
);


/* =========================================================
   SAVE EDITED PREVIEW
========================================================= */

saveEditedPreviewBtn.addEventListener(
    'click',
    () => {

        syncEditedTranslatedSrt();

        showStatus(
            translationStatus,
            '✅ Đã cập nhật bản SRT dịch hiện tại.',
            'success'
        );

    }
);


/* =========================================================
   MEMORY IMPORT
========================================================= */

memoryImportInput.addEventListener(
    'change',
    async event => {

        const file =
            event.target
                ?.files
                ?.item(0);

        if (!file) {
            return;
        }

        try {

            const text =
                await file.text();

            const data =
                JSON.parse(
                    text
                );

            if (
                !Array.isArray(
                    data
                )
            ) {
                throw new Error(
                    'JSON bộ nhớ phải là array.'
                );
            }

            let count = 0;

            for (
                const item of data
            ) {

                if (
                    addMemoryPair(
                        item?.source,
                        item?.target
                    )
                ) {

                    count++;

                }

            }

            saveMemory();

            showStatus(
                translationStatus,

                '✅ Đã nhập ' +
                count +
                ' ví dụ.',

                'success'
            );

        } catch (
            error
        ) {

            showStatus(
                translationStatus,

                '❌ Không nhập được bộ nhớ: ' +
                (
                    error?.message ||
                    'JSON lỗi'
                ),

                'error'
            );

        } finally {

            memoryImportInput.value =
                '';

        }

    }
);


/* =========================================================
   MEMORY EXPORT
========================================================= */

exportMemoryBtn.addEventListener(
    'click',
    () => {

        if (
            translationMemory.length ===
            0
        ) {

            showStatus(
                translationStatus,
                '⚠️ Bộ nhớ đang trống.',
                'warning'
            );

            return;

        }

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        translationMemory,
                        null,
                        2
                    )
                ],
                {
                    type:
                        'application/json;charset=utf-8'
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                'a'
            );

        link.href =
            url;

        link.download =
            'laysrt_translation_memory.json';

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1500
        );

    }
);


/* =========================================================
   CLEAR MEMORY
========================================================= */

clearMemoryBtn.addEventListener(
    'click',
    () => {

        if (
            translationMemory.length ===
            0
        ) {

            return;

        }

        const ok =
            confirm(
                'Xóa toàn bộ bộ nhớ dịch trên trình duyệt này?'
            );

        if (!ok) {
            return;
        }

        translationMemory =
            [];

        saveMemory();

        showStatus(
            translationStatus,
            '🗑️ Đã xóa toàn bộ bộ nhớ dịch.',
            'success'
        );

    }
);


/* =========================================================
   DICTIONARY UI
========================================================= */

dictionaryCards.forEach(
    card => {

        card.addEventListener(
            'click',
            () => {

                dictionaryCards
                    .forEach(
                        item =>
                            item.classList.remove(
                                'active'
                            )
                    );

                card.classList.add(
                    'active'
                );

                activeDictionary =
                    card.dataset.category;

                const names = {

                    normal:
                        'Bình thường',

                    xianxia:
                        'Tu tiên',

                    romance:
                        'Tình cảm'

                };

                dictionaryResult.innerHTML =
                    '📚 Đã chọn: <b>' +
                    (
                        names[
                            activeDictionary
                        ] ||
                        activeDictionary
                    ) +
                    '</b>';

            }
        );

    }
);


/* =========================================================
   DOWNLOAD
========================================================= */

function getBaseFileName() {

    if (!selectedFile) {
        return 'subtitle';
    }

    return selectedFile.name
        .replace(
            /\.[^/.]+$/,
            ''
        )
        .replace(
            /[\\/:*?"<>|]/g,
            '_'
        );

}


function downloadSrt(
    content,
    filename
) {

    if (!content) {
        return;
    }

    const blob =
        new Blob(
            [
                '\uFEFF' +
                content
            ],
            {
                type:
                    'text/plain;charset=utf-8'
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            'a'
        );

    link.href =
        url;

    link.download =
        filename;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1500
    );

}


// (syncEditedTranslatedSrt, showOriginalPreview, showTranslatedPreview nằm ở mục "XEM / SỬA SRT")


/* =========================================================
   BUTTON EVENTS
========================================================= */

convertBtn.addEventListener(
    'click',
    convertFile
);


translateBtn.addEventListener(
    'click',
    translateSubtitles
);


stopTranslateBtn.addEventListener(
    'click',
    () => {

        if (
            !translationAbortController
        ) {
            return;
        }

        translationAbortController.abort();

        stopTranslateBtn.disabled =
            true;

        showStatus(
            translationStatus,
            '⏳ Đang dừng dịch...',
            'warning'
        );

    }
);


downloadOriginalBtn.addEventListener(
    'click',
    () => {

        // SRT nhập vào: tải lại đúng từng byte đã nhập (không đổi mã hóa / xuống dòng / BOM).
        if (importedOriginal) {

            downloadOriginalImported();

            return;

        }

        downloadSrt(
            originalSrt,
            getBaseFileName() +
            '_goc.srt'
        );

    }
);


downloadTranslatedBtn.addEventListener(
    'click',
    () => {

        syncEditedTranslatedSrt();

        downloadSrt(
            translatedSrt,
            getBaseFileName() +
            '_vietsub.srt'
        );

        trDirty = false;

    }
);


previewOriginalBtn.addEventListener(
    'click',
    showOriginalPreview
);


previewTranslatedBtn.addEventListener(
    'click',
    showTranslatedPreview
);


/* >>> LAYSRT:srt >>> */

/* =========================================================
   LAYSRT — NHẬP SRT
   - Giải mã byte → chuỗi (UTF-8 / UTF-16 có BOM / GB18030 / Big5 ...)
   - Phân tích SRT "neo" theo dòng timestamp (chịu được dòng trống
     bên trong cue, thiếu số thứ tự, tọa độ sau timestamp ...)
   - Giữ nguyên số thứ tự + dòng timestamp thô khi xuất lại
   - SRT gốc bất biến: tải lại đúng từng byte đã nhập
========================================================= */

const SRT_TS_RE =
    /^\s*(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})(.*)$/;

const SRT_NUM_RE = /^\s*\d+\s*$/;

function isSrtFileName(name) {

    const n = String(name || '').toLowerCase();

    return n.endsWith('.srt') || n.endsWith('.txt');

}


const srtEncodingBox = $('srtEncodingBox');

const srtEncoding = $('srtEncoding');

const importReport = $('importReport');

const pasteInput = $('pasteInput');

const pasteImportBtn = $('pasteImportBtn');


function decodeSubtitleBytes(bytes, forced) {

    let start = 0;

    let bomEncoding = '';

    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {

        start = 3;

        bomEncoding = 'utf-8';

    } else if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {

        start = 2;

        bomEncoding = 'utf-16le';

    } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {

        start = 2;

        bomEncoding = 'utf-16be';

    }

    const view = start ? bytes.subarray(start) : bytes;

    const decode = (name, fatal) =>
        new TextDecoder(name, { fatal: Boolean(fatal) }).decode(view);

    if (forced && forced !== 'auto') {

        try {

            return { text: decode(forced, false), encoding: forced, guessed: false };

        } catch (error) { /* trình duyệt không hỗ trợ → tự đoán */ }

    }

    if (bomEncoding) {

        return {
            text: decode(bomEncoding, false),
            encoding: bomEncoding + ' (BOM)',
            guessed: false
        };

    }

    // UTF-16 không BOM: nhiều byte 0 ở vị trí lẻ (LE) hoặc chẵn (BE).
    const n = Math.min(view.length, 400);

    let odd = 0;

    let even = 0;

    for (let i = 0; i < n; i++) {

        if (view[i] === 0) {

            if (i % 2) {
                odd++;
            } else {
                even++;
            }

        }

    }

    if (n >= 8 && odd > n * 0.25) {
        return { text: decode('utf-16le', false), encoding: 'utf-16le', guessed: true };
    }

    if (n >= 8 && even > n * 0.25) {
        return { text: decode('utf-16be', false), encoding: 'utf-16be', guessed: true };
    }

    try {

        return { text: decode('utf-8', true), encoding: 'utf-8', guessed: false };

    } catch (error) { /* không phải UTF-8 hợp lệ */ }

    // Không phải UTF-8: thử GB18030 (phụ đề Trung hay gặp); nếu giải mã ra ký tự lỗi (�)
    // thì khả năng cao là mã hóa 1 byte kiểu Tây Âu → dùng Windows-1252.
    for (const name of ['gb18030', 'windows-1252']) {

        try {

            const text = decode(name, false);

            if (name === 'gb18030' && text.indexOf('\uFFFD') !== -1) {

                continue;

            }

            return { text, encoding: name, guessed: true };

        } catch (error) { /* thử tiếp */ }

    }

    return { text: decode('utf-8', false), encoding: 'utf-8 (có ký tự lỗi)', guessed: true };

}


function parseSrtStrict(rawText) {

    const text = String(rawText == null ? '' : rawText).replace(/^\uFEFF/, '');

    const crlf = (text.match(/\r\n/g) || []).length;

    const bareLf = (text.match(/(?:^|[^\r])\n/g) || []).length;

    const eol = crlf > 0 && crlf >= bareLf ? '\r\n' : '\n';

    const lines = text.replace(/\r\n?/g, '\n').split('\n');

    const heads = [];

    for (let i = 0; i < lines.length; i++) {

        if (SRT_TS_RE.test(lines[i])) {
            heads.push(i);
        }

    }

    const report = {
        eol,
        count: 0,
        orphanLines: 0,
        missingNumbers: 0,
        nonSequential: 0,
        duplicateNumbers: 0,
        emptyCues: 0,
        blankInside: 0,
        overlaps: 0,
        reversed: 0,
        badClock: 0,
        warnings: []
    };

    const cues = [];

    const seen = new Set();

    let prevEnd = -1;

    // Dòng rác trước cue đầu tiên (không phải dòng trống / số thứ tự của cue đầu).
    if (heads.length > 0) {

        const first = heads[0];

        const limit =
            first > 0 && SRT_NUM_RE.test(lines[first - 1])
                ? first - 1
                : first;

        for (let i = 0; i < limit; i++) {

            if (lines[i].trim() !== '') {
                report.orphanLines++;
            }

        }

    }

    for (let k = 0; k < heads.length; k++) {

        const h = heads[k];

        const m = SRT_TS_RE.exec(lines[h]);

        const startMs =
            (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000 +
            Number(m[4].padEnd(3, '0'));

        const endMs =
            (Number(m[5]) * 3600 + Number(m[6]) * 60 + Number(m[7])) * 1000 +
            Number(m[8].padEnd(3, '0'));

        if (Number(m[2]) > 59 || Number(m[3]) > 59 || Number(m[6]) > 59 || Number(m[7]) > 59) {
            report.badClock++;
        }

        // Số thứ tự: dòng toàn chữ số ngay trước timestamp.
        let num = null;

        const prevHead = k > 0 ? heads[k - 1] : -1;

        if (h - 1 > prevHead && SRT_NUM_RE.test(lines[h - 1])) {
            num = parseInt(lines[h - 1], 10);
        }

        // Nội dung: sau timestamp đến trước tiêu đề (số + timestamp) của cue kế.
        let end = lines.length;

        if (k + 1 < heads.length) {

            const nh = heads[k + 1];

            end = nh - 1 > h && SRT_NUM_RE.test(lines[nh - 1]) ? nh - 1 : nh;

        }

        const body = lines.slice(h + 1, end);

        while (body.length > 0 && body[body.length - 1].trim() === '') {
            body.pop();
        }

        if (body.some(line => line.trim() === '')) {
            report.blankInside++;
        }

        const textNorm = normalizeSubText(body.join('\n'));

        if (!textNorm) {
            report.emptyCues++;
        }

        if (num === null) {

            report.missingNumbers++;

        } else {

            if (num !== cues.length + 1) {
                report.nonSequential++;
            }

            if (seen.has(num)) {
                report.duplicateNumbers++;
            }

            seen.add(num);

        }

        if (endMs < startMs) {
            report.reversed++;
        }

        if (startMs < prevEnd) {
            report.overlaps++;
        }

        prevEnd = Math.max(prevEnd, endMs);

        cues.push({
            num,
            tsLine: lines[h].trim(),
            startMs,
            endMs,
            text: textNorm
        });

    }

    report.count = cues.length;

    const w = report.warnings;

    if (report.orphanLines) {
        w.push(report.orphanLines + ' dòng đầu file không thuộc phụ đề (bỏ qua khi làm việc; bản gốc vẫn giữ nguyên).');
    }

    if (report.missingNumbers) {
        w.push(report.missingNumbers + ' khối thiếu số thứ tự (sẽ đánh số theo vị trí khi xuất).');
    }

    if (report.nonSequential) {
        w.push(report.nonSequential + ' khối có số thứ tự khác vị trí — giữ nguyên số của file gốc.');
    }

    if (report.duplicateNumbers) {
        w.push(report.duplicateNumbers + ' khối trùng số thứ tự — giữ nguyên như file gốc.');
    }

    if (report.emptyCues) {
        w.push(report.emptyCues + ' khối không có nội dung.');
    }

    if (report.blankInside) {
        w.push(report.blankInside + ' khối có dòng trống bên trong — đã gộp lại để không làm vỡ khối SRT.');
    }

    if (report.overlaps) {
        w.push(report.overlaps + ' khối chồng thời gian với khối trước (giữ nguyên).');
    }

    if (report.reversed) {
        w.push(report.reversed + ' khối có thời gian kết thúc nhỏ hơn bắt đầu (giữ nguyên).');
    }

    if (report.badClock) {
        w.push(report.badClock + ' khối có phút/giây ≥ 60 (giữ nguyên).');
    }

    return { cues, report };

}


function triggerBlobDownload(blob, filename) {

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);

}


function downloadOriginalImported() {

    if (!importedOriginal) {
        return;
    }

    triggerBlobDownload(
        new Blob([importedOriginal.bytes], { type: 'application/x-subrip' }),
        getBaseFileName() + '_goc.srt'
    );

}


function resetForNewSource() {

    subtitles = [];

    originalSrt = '';

    translatedSrt = '';

    translatedBaseline = [];

    translatedList = [];

    translatedSource = [];

    translatedDirty = false;

    sourceBaseline = [];

    srcDirty = false;

    trDirty = false;

    liteFlags = {};

    importedOriginal = null;

    stats.classList.add('hidden');

    translationSection.classList.add('hidden');

    previewSection.classList.add('hidden');

    downloadOriginalBtn.disabled = true;

    downloadTranslatedBtn.disabled = true;

    previewTranslatedBtn.disabled = true;

    learnEditedBtn.disabled = true;

    saveEditedPreviewBtn.classList.add('hidden');

    importReport.classList.add('hidden');

}


function applyImportedSubtitles(parsed, original) {

    const eol = parsed.report.eol;

    subtitles = parsed.cues.map(cue => ({
        startMs: cue.startMs,
        endMs: cue.endMs,
        text: cue.text,
        num: cue.num,
        tsLine: cue.tsLine,
        eol
    }));

    // Bản gốc: đúng chuỗi đã giải mã + đúng byte đã nhập. Không bao giờ bị sửa.
    originalSrt = original.text;

    importedOriginal = {
        bytes: original.bytes,
        name: original.name,
        encoding: original.encoding,
        eol
    };

    translatedSrt = '';

    translatedBaseline = [];

    translatedList = [];

    translatedSource = [];

    translatedDirty = false;

    srcDirty = false;

    trDirty = false;

    liteFlags = {};

    captureSourceBaseline();

    subtitleCount.textContent = subtitles.length;

    let maxEnd = 0;

    for (const item of subtitles) {

        if (item.endMs > maxEnd) {
            maxEnd = item.endMs;
        }

    }

    durationInfo.textContent = msToSrtTime(maxEnd).slice(0, 5);

    stats.classList.remove('hidden');

    translationSection.classList.remove('hidden');

    previewSection.classList.remove('hidden');

    downloadOriginalBtn.disabled = false;

    downloadTranslatedBtn.disabled = true;

    previewTranslatedBtn.disabled = true;

    learnEditedBtn.disabled = true;

    showOriginalPreview();

    updateTranslationUI();

}


function showImportReport(parsed, original) {

    const lines = [];

    lines.push(
        '📥 ' + parsed.report.count + ' dòng • mã hóa ' + original.encoding +
        (original.guessed ? ' (tự đoán)' : '') +
        ' • xuống dòng ' + (parsed.report.eol === '\r\n' ? 'CRLF' : 'LF')
    );

    if (original.text.indexOf('�') !== -1) {
        lines.push('⚠️ Có ký tự lỗi (�). Hãy thử chọn mã hóa khác ở ô “Mã hóa file SRT” rồi bấm Nhập lại.');
    }

    parsed.report.warnings.forEach(line => lines.push('⚠️ ' + line));

    lines.push('🔒 SRT gốc được giữ nguyên từng byte; chỉnh sửa và dịch chỉ tác động lên bản làm việc.');

    importReport.textContent = lines.join('\n');

    importReport.className = 'status import-report ' + (parsed.report.warnings.length ? 'warning' : 'success');

}


function importSubtitleBytes(bytes, name, forcedEncoding, preDecodedText) {

    if (!bytes.length) {
        throw new Error('File đang trống.');
    }

    const decoded =
        preDecodedText !== undefined
            ? { text: preDecodedText, encoding: 'utf-8', guessed: false }
            : decodeSubtitleBytes(bytes, forcedEncoding);

    const probe = decoded.text.replace(/^\uFEFF/, '').trimStart();

    if (/^[\[{]/.test(probe)) {

        throw new Error(
            'Nội dung giống JSON, không phải SRT. Nếu đây là file CapCut, hãy đổi đuôi thành .json rồi chọn lại.'
        );

    }

    const parsed = parseSrtStrict(decoded.text);

    if (parsed.cues.length === 0) {

        throw new Error(
            'Không tìm thấy dòng thời gian dạng 00:00:01,000 --> 00:00:03,000. Kiểm tra lại file hoặc mã hóa.'
        );

    }

    const original = {
        text: decoded.text.replace(/^\uFEFF/, ''),
        bytes,
        name,
        encoding: decoded.encoding,
        guessed: decoded.guessed
    };

    applyImportedSubtitles(parsed, original);

    showImportReport(parsed, original);

    return parsed;

}


async function importSelectedSrt() {

    convertBtn.disabled = true;

    try {

        showStatus(convertStatus, '⏳ Đang đọc file SRT...', 'warning');

        const buffer = await selectedFile.arrayBuffer();

        const parsed = importSubtitleBytes(
            new Uint8Array(buffer),
            selectedFile.name,
            srtEncoding.value
        );

        showStatus(
            convertStatus,
            '✅ Đã nhập ' + parsed.report.count + ' dòng phụ đề từ SRT.',
            'success'
        );

    } catch (error) {

        showStatus(
            convertStatus,
            '❌ Lỗi: ' + (error?.message || 'Không xác định'),
            'error'
        );

    } finally {

        convertBtn.disabled = false;

    }

}


function importPastedSrt() {

    if (translationRunning) {

        showStatus(
            convertStatus,
            '⚠️ Đang dịch — hãy dừng dịch trước khi nhập SRT mới.',
            'warning'
        );

        return;

    }

    const text = pasteInput.value;

    if (!text.trim()) {

        showStatus(convertStatus, '⚠️ Ô dán SRT đang trống.', 'warning');

        return;

    }

    if (
        hasUnsavedWork() &&
        !window.confirm('Bạn còn chỉnh sửa / bản dịch chưa tải xuống. Nhập nội dung mới sẽ mất chúng. Tiếp tục?')
    ) {

        return;

    }

    try {

        selectedFile = null;

        fileInput.value = '';

        fileInfo.classList.add('hidden');

        srtEncodingBox.classList.add('hidden');

        convertBtn.disabled = true;

        const bytes = new TextEncoder().encode(text);

        const parsed = importSubtitleBytes(bytes, 'subtitle.srt', 'utf-8', text);

        showStatus(
            convertStatus,
            '✅ Đã nhập ' + parsed.report.count + ' dòng phụ đề từ nội dung dán.',
            'success'
        );

    } catch (error) {

        showStatus(
            convertStatus,
            '❌ Lỗi: ' + (error?.message || 'Không xác định'),
            'error'
        );

    }

}


pasteImportBtn.addEventListener('click', importPastedSrt);

/* <<< LAYSRT:srt <<< */


/* >>> LAYSRT:editor >>> */

/* =========================================================
   XEM / SỬA SRT (Bước 3)
   3 chế độ xem:
   - SRT gốc: văn bản nguyên bản, chỉ đọc, bất biến.
   - Bản nguồn: sửa lỗi văn bản nguồn (ví dụ nhận dạng sai) trước khi dịch.
   - SRT đã dịch: sửa bản dịch từng dòng.
   Chỉ nội dung chữ được sửa; số thứ tự, timestamp và cấu trúc khối được
   giữ nguyên từ file gốc nên SRT xuất ra luôn hợp lệ.
   Danh sách chia trang (40 dòng/trang) để nhẹ cho điện thoại yếu.
========================================================= */

const EDITOR_PAGE_SIZE = 40;

const previewSourceBtn = $('previewSourceBtn');

const editorPanel = $('editorPanel');

const editorList = $('editorList');

const editorSearch = $('editorSearch');

const editorFilter = $('editorFilter');

const editorSummary = $('editorSummary');

const editorPrevBtn = $('editorPrevBtn');

const editorNextBtn = $('editorNextBtn');

const editorPageInfo = $('editorPageInfo');

const editorRepairBtn = $('editorRepairBtn');

const editorNote = $('editorNote');

const downloadSourceBtn = $('downloadSourceBtn');

let editorPage = 0;

let editorView = [];

let translatedDirty = false;

let srcDirty = false;

let trDirty = false;

let editorSummaryTimer = null;

let editorQueryTimer = null;

const EDITOR_BADGES = {
    empty: ['❌ Trống', 'bad'],
    timestamp: ['❌ Có dòng thời gian', 'bad'],
    failed: ['❌ Chưa dịch được', 'bad'],
    pending: ['⏳ Chưa dịch', 'warn'],
    untranslated: ['⚠️ Còn tiếng nguồn', 'warn'],
    same_as_source: ['⚠️ Giống nguồn', 'warn'],
    too_long: ['⚠️ Dài bất thường', 'warn'],
    too_short: ['⚠️ Ngắn bất thường', 'warn'],
    skipped_long: ['ℹ️ Quá dài, giữ nguyên', 'info']
};


/* ---------------------------------------------------------
   Mô hình dữ liệu
--------------------------------------------------------- */

function captureSourceBaseline() {

    sourceBaseline = subtitles.map(item => item.text);

    if (downloadSourceBtn) {

        downloadSourceBtn.disabled = true;

    }

}


function editorKind() {

    return previewMode === 'source' ? 'source' : 'translated';

}


function cueNumberLabel(i) {

    const item = subtitles[i];

    return Number.isInteger(item.num) ? item.num : i + 1;

}


function isSourceEdited(i) {

    return sourceBaseline[i] !== undefined && subtitles[i].text !== sourceBaseline[i];

}


function isTranslationEdited(i) {

    return translatedBaseline[i] !== undefined && translatedList[i] !== translatedBaseline[i];

}


function isStale(i) {

    return translatedSource[i] !== undefined && translatedSource[i] !== subtitles[i].text;

}


function cueIssues(i) {

    const issues = [];

    const text = translatedList[i];

    if (!text && subtitles[i].text) {

        issues.push('empty');

    }

    if (text && /-->/.test(text)) {

        issues.push('timestamp');

    }

    const flags = liteFlags[i];

    if (flags) {

        for (const flag of flags) {

            if (!issues.includes(flag)) {

                issues.push(flag);

            }

        }

    }

    return issues;

}


function rebuildTranslatedSrt() {

    if (subtitles.length === 0 || translatedList.length !== subtitles.length) {

        return;

    }

    translatedSrt = subtitlesToSrt(
        subtitles.map((item, i) => Object.assign({}, item, { text: translatedList[i] }))
    );

    translatedDirty = false;

}


// Ghi nội dung ô đang gõ vào mô hình và dựng lại SRT nếu cần.
function flushEditor() {

    const el = document.activeElement;

    if (el && el.classList && el.classList.contains('cue-edit')) {

        commitCueField(el, true);

    }

    if (translatedDirty) {

        rebuildTranslatedSrt();

    }

}


function hasUnsavedWork() {

    return srcDirty || trDirty;

}


/* ---------------------------------------------------------
   Hiển thị
--------------------------------------------------------- */

function applyPreviewChrome() {

    const mode = previewMode;

    [
        [previewOriginalBtn, 'original'],
        [previewSourceBtn, 'source'],
        [previewTranslatedBtn, 'translated']
    ].forEach(pair => {

        pair[0].classList.toggle('btn-primary', mode === pair[1]);

        pair[0].classList.toggle('btn-secondary', mode !== pair[1]);

    });

    preview.classList.toggle('hidden', mode !== 'original');

    editorPanel.classList.toggle('hidden', mode === 'original');

    saveEditedPreviewBtn.classList.add('hidden');

    learnEditedBtn.disabled = mode !== 'translated';

    editorRepairBtn.classList.toggle('hidden', mode !== 'translated');

    // Lọc "Cảnh báo / Nguồn đã đổi" chỉ có ý nghĩa ở bản dịch.
    Array.from(editorFilter.options).forEach(option => {

        if (option.value === 'flagged' || option.value === 'stale') {

            option.disabled = mode !== 'translated';

        }

    });

    if (editorFilter.selectedOptions[0] && editorFilter.selectedOptions[0].disabled) {

        editorFilter.value = 'all';

    }

}


function buildEditorView() {

    const kind = editorKind();

    const query = editorSearch.value.trim().toLowerCase();

    const filter = editorFilter.value;

    const out = [];

    for (let i = 0; i < subtitles.length; i++) {

        if (filter === 'edited') {

            if (kind === 'source' ? !isSourceEdited(i) : !isTranslationEdited(i)) {

                continue;

            }

        } else if (filter === 'flagged') {

            if (kind !== 'translated' || cueIssues(i).length === 0) {

                continue;

            }

        } else if (filter === 'stale') {

            if (kind !== 'translated' || !isStale(i)) {

                continue;

            }

        }

        if (query) {

            const hay =
                kind === 'source'
                    ? subtitles[i].text
                    : translatedList[i] + '\n' + subtitles[i].text;

            if (!hay.toLowerCase().includes(query)) {

                continue;

            }

        }

        out.push(i);

    }

    return out;

}


function makeEl(tag, className, text) {

    const el = document.createElement(tag);

    if (className) {

        el.className = className;

    }

    if (text != null) {

        el.textContent = text;

    }

    return el;

}


function buildRow(i, kind) {

    const item = subtitles[i];

    const row = makeEl('div', 'cue-row');

    row.dataset.i = String(i);

    const head = makeEl('div', 'cue-head');

    head.appendChild(makeEl('span', 'cue-num', '#' + cueNumberLabel(i)));

    head.appendChild(
        makeEl(
            'span',
            'cue-time',
            msToSrtTime(item.startMs) + ' → ' + msToSrtTime(item.endMs)
        )
    );

    head.appendChild(makeEl('span', 'cue-badges'));

    row.appendChild(head);

    if (kind === 'translated') {

        row.appendChild(makeEl('div', 'cue-src', item.text));

    }

    const text = kind === 'source' ? item.text : translatedList[i];

    const area = makeEl('textarea', 'cue-edit');

    area.value = text;

    area.rows = Math.min(6, Math.max(2, String(text).split('\n').length));

    area.spellcheck = false;

    area.readOnly = Boolean(translationRunning);

    area.setAttribute('aria-label', (kind === 'source' ? 'Nguồn dòng ' : 'Bản dịch dòng ') + cueNumberLabel(i));

    row.appendChild(area);

    const revert = makeEl('button', 'cue-revert hidden', '↩ Hoàn lại');

    revert.type = 'button';

    row.appendChild(revert);

    refreshRow(row, i, kind);

    return row;

}


function refreshRow(row, i, kind) {

    const edited = kind === 'source' ? isSourceEdited(i) : isTranslationEdited(i);

    const issues = kind === 'translated' ? cueIssues(i) : [];

    const stale = kind === 'translated' && isStale(i);

    row.classList.toggle('edited', edited);

    row.classList.toggle('flagged', issues.length > 0);

    row.classList.toggle('stale', stale);

    const badges = row.querySelector('.cue-badges');

    badges.textContent = '';

    const add = (label, cls) => badges.appendChild(makeEl('span', 'badge ' + cls, label));

    if (edited) {

        add('✏️ Đã sửa', 'edit');

    }

    issues.forEach(code => {

        const def = EDITOR_BADGES[code];

        if (def) {

            add(def[0], def[1]);

        }

    });

    if (stale) {

        add('⏱ Nguồn đã đổi sau khi dịch', 'warn');

    }

    row.querySelector('.cue-revert').classList.toggle('hidden', !edited);

}


function computeEditorStats() {

    let sourceEdited = 0;

    let edited = 0;

    let flagged = 0;

    let stale = 0;

    const hasTranslation = translatedList.length === subtitles.length;

    for (let i = 0; i < subtitles.length; i++) {

        if (isSourceEdited(i)) {

            sourceEdited++;

        }

        if (hasTranslation) {

            if (isTranslationEdited(i)) {

                edited++;

            }

            if (cueIssues(i).length > 0) {

                flagged++;

            }

            if (isStale(i)) {

                stale++;

            }

        }

    }

    return { sourceEdited, edited, flagged, stale };

}


function updateEditorSummary() {

    const kind = editorKind();

    const stats = computeEditorStats();

    downloadSourceBtn.disabled = stats.sourceEdited === 0;

    // Sửa nguồn làm mã băm của dòng đó không còn khớp tiến độ LiteRouter đã lưu.
    if (kind === 'source') {

        liteRefreshResumeUI();

    }

    if (previewMode === 'original') {

        return;

    }

    const parts = ['Hiển thị ' + editorView.length + '/' + subtitles.length + ' dòng'];

    if (kind === 'source') {

        parts.push('đã sửa ' + stats.sourceEdited);

    } else {

        parts.push('đã sửa ' + stats.edited);

        parts.push('cảnh báo ' + stats.flagged);

        if (stats.stale > 0) {

            parts.push('nguồn đã đổi ' + stats.stale);

        }

    }

    editorSummary.textContent = parts.join(' • ');

}


function scheduleEditorSummary() {

    clearTimeout(editorSummaryTimer);

    editorSummaryTimer = setTimeout(updateEditorSummary, 250);

}


function renderEditor() {

    if (previewMode === 'original') {

        return;

    }

    editorView = buildEditorView();

    const pages = Math.max(1, Math.ceil(editorView.length / EDITOR_PAGE_SIZE));

    editorPage = Math.min(Math.max(0, editorPage), pages - 1);

    const kind = editorKind();

    const start = editorPage * EDITOR_PAGE_SIZE;

    const end = Math.min(editorView.length, start + EDITOR_PAGE_SIZE);

    const frag = document.createDocumentFragment();

    for (let k = start; k < end; k++) {

        frag.appendChild(buildRow(editorView[k], kind));

    }

    editorList.textContent = '';

    if (editorView.length === 0) {

        editorList.appendChild(
            makeEl('div', 'editor-empty', 'Không có dòng nào khớp bộ lọc / từ khóa.')
        );

    } else {

        editorList.appendChild(frag);

    }

    editorPageInfo.textContent = 'Trang ' + (editorPage + 1) + '/' + pages;

    editorPrevBtn.disabled = editorPage <= 0;

    editorNextBtn.disabled = editorPage >= pages - 1;

    syncEditorLock();

    updateEditorSummary();

}


function syncEditorLock() {

    const locked = Boolean(translationRunning);

    editorList.querySelectorAll('.cue-edit').forEach(area => {

        area.readOnly = locked;

    });

    editorList.querySelectorAll('.cue-revert').forEach(button => {

        button.disabled = locked;

    });

    editorRepairBtn.disabled = locked;

    editorNote.classList.toggle('hidden', !locked);

}


function scrollEditorTop() {

    const section = $('previewSection');

    if (section && typeof section.scrollIntoView === 'function') {

        section.scrollIntoView({ block: 'start' });

    }

}


/* ---------------------------------------------------------
   Sửa từng dòng
--------------------------------------------------------- */

function commitCueField(area, normalizeBox) {

    const row = area.closest('.cue-row');

    if (!row || translationRunning) {

        return;

    }

    const i = Number(row.dataset.i);

    if (!Number.isInteger(i) || i < 0 || i >= subtitles.length) {

        return;

    }

    const kind = editorKind();

    const text = normalizeSubText(area.value);

    if (kind === 'source') {

        if (subtitles[i].text !== text) {

            subtitles[i].text = text;

            srcDirty = true;

        }

    } else if (translatedList.length === subtitles.length && translatedList[i] !== text) {

        translatedList[i] = text;

        translatedDirty = true;

        trDirty = true;

        delete liteFlags[i];

    }

    if (normalizeBox && area.value !== text) {

        area.value = text;

    }

    refreshRow(row, i, kind);

    scheduleEditorSummary();

}


function revertCue(row) {

    if (!row || translationRunning) {

        return;

    }

    const i = Number(row.dataset.i);

    const kind = editorKind();

    const area = row.querySelector('.cue-edit');

    if (kind === 'source') {

        subtitles[i].text = sourceBaseline[i];

        area.value = sourceBaseline[i];

        srcDirty = true;

    } else {

        translatedList[i] = translatedBaseline[i];

        area.value = translatedBaseline[i];

        translatedDirty = true;

        trDirty = true;

    }

    refreshRow(row, i, kind);

    scheduleEditorSummary();

}


function repairTranslations() {

    if (translationRunning) {

        return;

    }

    flushEditor();

    if (translatedList.length !== subtitles.length) {

        return;

    }

    const stampRe = /\d{1,3}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,3}:\d{2}:\d{2}[,.]\d{1,3}/g;

    let fixed = 0;

    for (let i = 0; i < subtitles.length; i++) {

        let text = translatedList[i];

        if (/-->/.test(text)) {

            text = normalizeSubText(text.replace(stampRe, ''));

        }

        if (!text && subtitles[i].text) {

            text = translatedBaseline[i] || subtitles[i].text;

        }

        if (text !== translatedList[i]) {

            translatedList[i] = text;

            fixed++;

        }

    }

    if (fixed > 0) {

        translatedDirty = true;

        trDirty = true;

        rebuildTranslatedSrt();

    }

    renderEditor();

    showStatus(
        translationStatus,
        fixed > 0
            ? '🔧 Đã sửa nhanh ' + fixed + ' dòng (điền lại dòng trống, bỏ dòng thời gian lẫn trong chữ).'
            : 'ℹ️ Không có dòng trống hay dòng thời gian lẫn trong chữ để sửa.',
        fixed > 0 ? 'success' : 'info'
    );

}


/* ---------------------------------------------------------
   Chuyển chế độ xem
--------------------------------------------------------- */

function showOriginalPreview() {

    flushEditor();

    previewMode = 'original';

    preview.value = originalSrt;

    preview.readOnly = true;

    applyPreviewChrome();

    liteRefreshResumeUI();

}


function showSourceEditor() {

    if (subtitles.length === 0) {

        return;

    }

    flushEditor();

    previewMode = 'source';

    applyPreviewChrome();

    editorPage = 0;

    renderEditor();

    liteRefreshResumeUI();

}


function showTranslatedPreview() {

    if (subtitles.length === 0 || translatedList.length !== subtitles.length) {

        return;

    }

    flushEditor();

    if (translatedDirty || !translatedSrt) {

        rebuildTranslatedSrt();

    }

    if (!translatedSrt) {

        return;

    }

    previewMode = 'translated';

    preview.value = translatedSrt;

    preview.readOnly = true;

    applyPreviewChrome();

    editorPage = 0;

    renderEditor();

    liteRefreshResumeUI();

}


// Tải SRT: luôn ghi nốt ô đang gõ và dựng lại SRT trước khi xuất.
function syncEditedTranslatedSrt() {

    flushEditor();

    if (translatedDirty) {

        rebuildTranslatedSrt();

    }

}


/* ---------------------------------------------------------
   Sự kiện
--------------------------------------------------------- */

editorList.addEventListener('input', event => {

    const area = event.target;

    if (area && area.classList && area.classList.contains('cue-edit')) {

        commitCueField(area, false);

    }

});


editorList.addEventListener('focusout', event => {

    const area = event.target;

    if (area && area.classList && area.classList.contains('cue-edit')) {

        commitCueField(area, true);

    }

});


editorList.addEventListener('click', event => {

    const button = event.target && event.target.closest ? event.target.closest('.cue-revert') : null;

    if (button) {

        revertCue(button.closest('.cue-row'));

    }

});


function editorQueryChanged() {

    clearTimeout(editorQueryTimer);

    editorQueryTimer = setTimeout(() => {

        flushEditor();

        editorPage = 0;

        renderEditor();

    }, 200);

}


editorSearch.addEventListener('input', editorQueryChanged);

editorFilter.addEventListener('change', () => {

    flushEditor();

    editorPage = 0;

    renderEditor();

});


editorPrevBtn.addEventListener('click', () => {

    flushEditor();

    editorPage--;

    renderEditor();

    scrollEditorTop();

});


editorNextBtn.addEventListener('click', () => {

    flushEditor();

    editorPage++;

    renderEditor();

    scrollEditorTop();

});


editorRepairBtn.addEventListener('click', repairTranslations);

previewSourceBtn.addEventListener('click', showSourceEditor);

downloadSourceBtn.addEventListener('click', () => {

    flushEditor();

    downloadSrt(subtitlesToSrt(subtitles), getBaseFileName() + '_nguon.srt');

    srcDirty = false;

});

/* <<< LAYSRT:editor <<< */


/* >>> LAYSRT:lite >>> */

/* =========================================================
   LITEROUTER — dịch qua /api/translate
   - Model (gpt-6-terra), endpoint và API key chỉ nằm ở backend.
     Frontend KHÔNG gửi model, endpoint hay khóa.
   - Chia lượt ≈60 dòng / ≈11.000 ký tự, mỗi lượt kèm ngữ cảnh + bộ nhớ dịch.
   - Mỗi lượt giữ "ảnh chụp" prompt lúc bắt đầu; thử lại / chia đôi lượt
     dùng lại đúng ảnh chụp đó; lượt mới dùng prompt hiện tại.
   - Tiến độ lưu vào localStorage (từng dòng có mã băm nguồn) → tải lại
     trang vẫn tiếp tục được, dòng nguồn đã sửa sẽ tự được dịch lại.
   - Chia đôi lượt khi lỗi, ngắt mạch khi lỗi liên tiếp, giữ màn hình
     sáng (Wake Lock) khi đang dịch trên điện thoại.
========================================================= */

const LITE_ENDPOINT = '/api/translate';

const LITE_JOB_KEY = 'laysrt_lite_job_v1';

const LITE = {
    maxCues: 60,
    maxChars: 11000,
    maxCueChars: 2000,
    maxPromptChars: 8000,
    memoryItems: 20,
    contextLines: 3,
    attempts: 3,
    rateLimitAttempts: 6,
    breaker: 3,
    timeoutMs: 65000,
    saveEveryMs: 1500
};

const LITE_FLAG_REVIEW = ['untranslated', 'same_as_source', 'too_long', 'too_short'];

const LITE_TAG_RE = /<\/?[a-zA-Z][^<>]{0,80}>|\{\\[^{}]{1,80}\}/g;

const literouterOptions = $('literouterOptions');

const liteServerStatus = $('liteServerStatus');

const liteResumeBox = $('liteResumeBox');

const liteResumeText = $('liteResumeText');

const liteDiscardBtn = $('liteDiscardBtn');

const liteRedoBtn = $('liteRedoBtn');

const promptCounter = $('promptCounter');

let liteJobActive = false;

let liteWakeLock = null;

let liteLastSave = 0;

let liteProbeAt = 0;

let liteSaveFailed = false;


class LiteError extends Error {

    constructor(code, message, opts) {

        super(message);

        const o = opts || {};

        this.name = 'LiteError';

        this.code = code;

        this.retryable = Boolean(o.retryable);

        this.shrink = Boolean(o.shrink);

        this.fatal = Boolean(o.fatal);

        this.retryAfter = Number(o.retryAfter) || 0;

        this.status = Number(o.status) || 0;

    }

}


function liteAbortError() {

    return new DOMException('Aborted', 'AbortError');

}


/* ---------------------------------------------------------
   Tiện ích nhỏ
--------------------------------------------------------- */

function hash32(text) {

    const s = String(text == null ? '' : text);

    let h = 0x811c9dc5;

    for (let i = 0; i < s.length; i++) {

        h ^= s.charCodeAt(i);

        h = Math.imul(h, 0x01000193);

    }

    return (h >>> 0).toString(36);

}


function liteCueHash(text, src, tgt) {

    return hash32(src + '>' + tgt + '\u0001' + text);

}


function liteStructureSig(subs) {

    let h = 0x811c9dc5;

    for (let i = 0; i < subs.length; i++) {

        const s = subs[i].startMs + '-' + subs[i].endMs + ';';

        for (let k = 0; k < s.length; k++) {

            h ^= s.charCodeAt(k);

            h = Math.imul(h, 0x01000193);

        }

    }

    return subs.length + ':' + (h >>> 0).toString(36);

}


function liteStripTags(text) {

    return String(text == null ? '' : text)
        .replace(LITE_TAG_RE, '')
        .replace(/\s+/g, ' ')
        .trim();

}


// Thẻ định dạng (<i>, {\an8}...) được thay bằng {{n}} khi gửi đi và khôi phục
// khi nhận về. Máy chủ kiểm tra mỗi ký hiệu xuất hiện đúng số lần.
function liteProtectTags(text) {

    const tags = [];

    if (/\{\{\d{1,3}\}\}/.test(text)) {

        return { text, tags };

    }

    const out = text.replace(LITE_TAG_RE, match => {

        tags.push(match);

        return '{{' + tags.length + '}}';

    });

    return { text: out, tags };

}


function liteRestoreTags(text, tags) {

    if (!tags.length) {

        return text;

    }

    return text.replace(/\{\{(\d{1,3})\}\}/g, (match, n) => {

        const tag = tags[Number(n) - 1];

        return tag != null ? tag : match;

    });

}


function liteBuildItems(subs) {

    const items = new Array(subs.length);

    for (let i = 0; i < subs.length; i++) {

        const original = String(subs[i].text == null ? '' : subs[i].text);

        const prot = liteProtectTags(original);

        const letters = prot.text.replace(/\{\{\d{1,3}\}\}/g, '');

        const item = {
            text: prot.text,
            tags: prot.tags,
            needs: false,
            skipFlag: ''
        };

        if (!original.trim() || !/\p{L}/u.test(letters)) {

            // Rỗng / chỉ có ký hiệu, số: không cần dịch, giữ nguyên.

        } else if (prot.text.length > LITE.maxCueChars) {

            item.skipFlag = 'skipped_long';

        } else {

            item.needs = true;

        }

        items[i] = item;

    }

    return items;

}


/* ---------------------------------------------------------
   Prompt: lớp 2 của prompt 3 lớp (lớp 1 là luật cứng ở backend,
   lớp 3 là dữ liệu phụ đề)
--------------------------------------------------------- */

function liteBrief() {

    let instructions = customPrompt.value.trim();

    if (!instructions) {

        instructions = PROMPT_PRESETS.natural.trim();

    }

    instructions =
        instructions
            .replaceAll('{{SOURCE_LANGUAGE}}', languageName(sourceLanguage.value))
            .replaceAll('{{TARGET_LANGUAGE}}', languageName(targetLanguage.value))
            .replaceAll('{{TRANSLATION_MODE}}', modeName(translationMode.value))
            .replaceAll('{{STYLE}}', styleName(translationStyle.value))
            .replaceAll('{{ACCURACY}}', accuracyName(accuracyLevel.value));

    return (
        instructions +
        '\n\nTHÔNG TIN DỊCH:\n' +
        '- Chế độ dịch: ' + modeName(translationMode.value) + '\n' +
        '- Văn phong: ' + styleName(translationStyle.value) + '\n' +
        '- Độ chính xác: ' + accuracyName(accuracyLevel.value)
    ).trim();

}


function liteTakeSnapshot() {

    const brief = liteBrief();

    return { brief, pid: hash32(brief) };

}


function updatePromptCounter() {

    if (!promptCounter) {

        return;

    }

    const isLite = translationMethod.value === 'literouter';

    promptCounter.classList.toggle('hidden', !isLite);

    if (!isLite) {

        return;

    }

    const n = liteBrief().length;

    promptCounter.textContent =
        'Prompt gửi đi: ' + n.toLocaleString('vi-VN') + ' / ' +
        LITE.maxPromptChars.toLocaleString('vi-VN') + ' ký tự';

    promptCounter.classList.toggle('over', n > LITE.maxPromptChars);

}


/* ---------------------------------------------------------
   Tiến độ lưu trên trình duyệt
--------------------------------------------------------- */

function liteNewJob(sig, total) {

    return {
        v: 1,
        id: 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        sig,
        total,
        t0: Date.now(),
        t1: Date.now(),
        done: {}
    };

}


function liteLoadJob() {

    try {

        const raw = localStorage.getItem(LITE_JOB_KEY);

        if (!raw) {

            return null;

        }

        const job = JSON.parse(raw);

        if (
            !job ||
            job.v !== 1 ||
            typeof job.sig !== 'string' ||
            !job.done ||
            typeof job.done !== 'object' ||
            Array.isArray(job.done)
        ) {

            return null;

        }

        return job;

    } catch (error) {

        return null;

    }

}


function liteSaveJob(job, force) {

    const now = Date.now();

    if (!force && now - liteLastSave < LITE.saveEveryMs) {

        return;

    }

    liteLastSave = now;

    job.t1 = now;

    try {

        localStorage.setItem(LITE_JOB_KEY, JSON.stringify(job));

        liteSaveFailed = false;

    } catch (error) {

        // Hết dung lượng: vẫn dịch bình thường, chỉ không khôi phục được sau khi tải lại.
        liteSaveFailed = true;

    }

}


function liteClearJob() {

    try {

        localStorage.removeItem(LITE_JOB_KEY);

    } catch (error) { /* bỏ qua */ }

}


// Đếm số dòng của tiến độ đã lưu còn dùng được cho file hiện tại.
function liteInspectJob() {

    const result = { valid: 0, need: 0, flagged: 0, t1: 0, hasJob: false };

    if (subtitles.length === 0) {

        return result;

    }

    const job = liteLoadJob();

    const items = liteBuildItems(subtitles);

    for (const item of items) {

        if (item.needs) {

            result.need++;

        }

    }

    if (!job || job.sig !== liteStructureSig(subtitles) || job.total !== subtitles.length) {

        return result;

    }

    const src = sourceLanguage.value;

    const tgt = targetLanguage.value;

    result.hasJob = true;

    result.t1 = Number(job.t1) || 0;

    for (const key of Object.keys(job.done)) {

        const i = Number(key);

        const entry = job.done[key];

        if (
            Number.isInteger(i) &&
            i >= 0 &&
            i < subtitles.length &&
            items[i].needs &&
            Array.isArray(entry) &&
            entry[0] === liteCueHash(subtitles[i].text, src, tgt) &&
            typeof entry[1] === 'string' &&
            entry[1]
        ) {

            result.valid++;

            if (entry[2] && entry[2].split(',').some(flag => LITE_FLAG_REVIEW.includes(flag))) {

                result.flagged++;

            }

        }

    }

    return result;

}


function liteFormatTime(ms) {

    if (!ms) {

        return '';

    }

    const d = new Date(ms);

    const pad = n => String(n).padStart(2, '0');

    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1);

}


function liteRefreshResumeUI() {

    const isLite = translationMethod.value === 'literouter';

    if (!liteResumeBox) {

        return;

    }

    if (!isLite) {

        liteResumeBox.classList.add('hidden');

        if (translateBtn.dataset.lite === '1') {

            translateBtn.textContent = '🌐 Bắt đầu dịch';

            delete translateBtn.dataset.lite;

        }

        return;

    }

    if (translationRunning) {

        return;

    }

    const info = liteInspectJob();

    if (info.valid > 0) {

        translateBtn.textContent =
            info.valid >= info.need
                ? '✅ Dùng bản dịch đã lưu (' + info.valid + '/' + info.need + ')'
                : '▶ Tiếp tục dịch (' + info.valid + '/' + info.need + ')';

        translateBtn.dataset.lite = '1';

        liteResumeText.textContent =
            'Đã lưu ' + info.valid + '/' + info.need + ' dòng dịch từ lần trước (' +
            liteFormatTime(info.t1) + '). Bấm nút dịch để dùng lại và dịch phần còn lại. ' +
            'Bấm “Bỏ tiến độ” nếu muốn dịch lại từ đầu bằng prompt hiện tại.' +
            (info.flagged > 0 ? ' Có ' + info.flagged + ' dòng được AI đánh dấu cần kiểm tra.' : '');

        liteResumeBox.classList.remove('hidden');

        liteRedoBtn.classList.toggle('hidden', info.flagged === 0);

        liteRedoBtn.textContent = '🔁 Dịch lại ' + info.flagged + ' dòng cảnh báo';

    } else {

        liteResumeBox.classList.add('hidden');

        translateBtn.textContent = '🌐 Bắt đầu dịch';

        translateBtn.dataset.lite = '1';

    }

}


function liteDiscardProgress() {

    if (translationRunning) {

        return;

    }

    liteClearJob();

    showStatus(translationStatus, '🗑️ Đã bỏ tiến độ dịch đã lưu. Lần dịch tới sẽ bắt đầu từ đầu.', 'info');

    liteRefreshResumeUI();

}


function liteRedoFlagged() {

    if (translationRunning) {

        return;

    }

    const job = liteLoadJob();

    if (!job || job.sig !== liteStructureSig(subtitles)) {

        return;

    }

    let removed = 0;

    for (const key of Object.keys(job.done)) {

        const entry = job.done[key];

        if (Array.isArray(entry) && entry[2] && entry[2].split(',').some(flag => LITE_FLAG_REVIEW.includes(flag))) {

            delete job.done[key];

            removed++;

        }

    }

    if (removed === 0) {

        return;

    }

    liteSaveJob(job, true);

    translateSubtitles();

}


/* ---------------------------------------------------------
   Kiểm tra máy chủ
--------------------------------------------------------- */

async function liteProbe(force) {

    if (!liteServerStatus) {

        return;

    }

    if (!force && Date.now() - liteProbeAt < 60000) {

        return;

    }

    liteProbeAt = Date.now();

    showStatus(liteServerStatus, '⏳ Đang kiểm tra máy chủ dịch...', 'info');

    try {

        const response = await fetch(LITE_ENDPOINT, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin'
        });

        let data = null;

        try {

            data = await response.json();

        } catch (error) {

            data = null;

        }

        if (response.ok && data && data.ok === true) {

            if (data.configured) {

                showStatus(
                    liteServerStatus,
                    '✅ Máy chủ dịch sẵn sàng (tối đa ' +
                    ((data.limits && data.limits.maxCues) || LITE.maxCues) + ' dòng / lượt).',
                    'success'
                );

            } else {

                showStatus(
                    liteServerStatus,
                    '⚠️ Máy chủ chưa có biến môi trường LITEROUTER_API_KEY. ' +
                    'Thêm trong Vercel → Settings → Environment Variables rồi Redeploy.',
                    'warning'
                );

            }

        } else if (response.status === 404 || response.status === 405 || response.status === 501) {

            showStatus(
                liteServerStatus,
                '❌ Không thấy /api/translate. LiteRouter chỉ chạy khi trang được deploy lên Vercel ' +
                '(không chạy khi mở file trực tiếp hoặc trên GitHub Pages). Các phương thức khác vẫn dùng bình thường.',
                'error'
            );

        } else {

            showStatus(
                liteServerStatus,
                '⚠️ Không kiểm tra được máy chủ dịch (HTTP ' + response.status + ').',
                'warning'
            );

        }

    } catch (error) {

        showStatus(
            liteServerStatus,
            '⚠️ Không kết nối được máy chủ dịch. Kiểm tra mạng rồi thử lại.',
            'warning'
        );

    }

}


/* ---------------------------------------------------------
   Gọi /api/translate
--------------------------------------------------------- */

const LITE_FATAL_CODES = [
    'server_not_configured',
    'upstream_config',
    'quota_exhausted',
    'bad_origin',
    'unsupported_media_type',
    'method_not_allowed',
    'prompt_too_long',
    'bad_json',
    'bad_request',
    'bad_cue',
    'duplicate_id',
    'no_cues',
    'cue_too_long'
];


function liteErrorFromResponse(status, data) {

    const err = data && data.error;

    if (err && typeof err.code === 'string') {

        return new LiteError(err.code, String(err.message || 'Lỗi máy chủ dịch.'), {
            status,
            retryable: Boolean(err.retryable),
            shrink: Boolean(err.shrink),
            retryAfter: err.retryAfter,
            fatal: LITE_FATAL_CODES.includes(err.code)
        });

    }

    if (status === 404 || status === 405 || status === 501) {

        return new LiteError(
            'no_backend',
            'Không thấy /api/translate. Hãy mở LaySRT từ bản đã deploy lên Vercel (không mở file trực tiếp hoặc GitHub Pages).',
            { status, fatal: true }
        );

    }

    if (status === 401 || status === 403) {

        return new LiteError(
            'blocked',
            'Máy chủ từ chối yêu cầu (HTTP ' + status + '). Nếu dùng Vercel, hãy tắt Deployment Protection cho domain đang mở.',
            { status, fatal: true }
        );

    }

    if (status === 413) {

        return new LiteError('payload_too_large', 'Lượt dịch quá lớn.', { status, shrink: true });

    }

    if (status === 429) {

        return new LiteError('rate_limited', 'Máy chủ đang bận (giới hạn tốc độ).', { status, retryable: true, retryAfter: 8 });

    }

    if (status === 408 || status === 504) {

        return new LiteError('timeout', 'Máy chủ phản hồi quá lâu.', { status, retryable: true, shrink: true });

    }

    if (status >= 500) {

        return new LiteError('server_error', 'Máy chủ dịch tạm thời lỗi (HTTP ' + status + ').', { status, retryable: true });

    }

    return new LiteError('bad_response', 'Phản hồi không hợp lệ từ máy chủ (HTTP ' + status + ').', { status, retryable: true });

}


async function liteRequest(body, signal) {

    if (signal && signal.aborted) {

        throw liteAbortError();

    }

    const controller = new AbortController();

    let timedOut = false;

    const onAbort = () => controller.abort();

    if (signal) {

        signal.addEventListener('abort', onAbort, { once: true });

    }

    const timer = setTimeout(() => {

        timedOut = true;

        controller.abort();

    }, LITE.timeoutMs);

    const failFromAbort = () => {

        if (signal && signal.aborted) {

            return liteAbortError();

        }

        if (timedOut) {

            return new LiteError('timeout', 'Máy chủ phản hồi quá lâu.', { retryable: true, shrink: true });

        }

        return null;

    };

    try {

        let response;

        try {

            response = await fetch(LITE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                cache: 'no-store',
                credentials: 'same-origin',
                signal: controller.signal
            });

        } catch (error) {

            throw failFromAbort() ||
                new LiteError('network', 'Không kết nối được máy chủ dịch (kiểm tra mạng).', { retryable: true });

        }

        let data = null;

        try {

            data = await response.json();

        } catch (error) {

            const aborted = failFromAbort();

            if (aborted) {

                throw aborted;

            }

            data = null;

        }

        if (response.ok && data && data.ok === true && Array.isArray(data.cues)) {

            return data;

        }

        throw liteErrorFromResponse(response.status, data);

    } finally {

        clearTimeout(timer);

        if (signal) {

            signal.removeEventListener('abort', onAbort);

        }

    }

}


/* ---------------------------------------------------------
   Giữ màn hình sáng khi đang dịch
--------------------------------------------------------- */

async function liteAcquireWakeLock() {

    try {

        if ('wakeLock' in navigator && !liteWakeLock) {

            liteWakeLock = await navigator.wakeLock.request('screen');

            liteWakeLock.addEventListener('release', () => {

                liteWakeLock = null;

            });

        }

    } catch (error) {

        liteWakeLock = null;

    }

}


function liteReleaseWakeLock() {

    try {

        if (liteWakeLock) {

            liteWakeLock.release();

        }

    } catch (error) { /* bỏ qua */ }

    liteWakeLock = null;

}


document.addEventListener('visibilitychange', () => {

    if (liteJobActive && document.visibilityState === 'visible' && !liteWakeLock) {

        liteAcquireWakeLock();

    }

});


/* ---------------------------------------------------------
   Lập kế hoạch lượt
--------------------------------------------------------- */

function litePlanChunks(indices, items, maxCues) {

    const chunks = [];

    let cur = null;

    let chars = 0;

    for (const i of indices) {

        const len = items[i].text.length;

        if (cur && (cur.idx.length >= maxCues || chars + len > LITE.maxChars)) {

            chunks.push(cur);

            cur = null;

        }

        if (!cur) {

            cur = { idx: [], attempts: 0, snap: null };

            chars = 0;

        }

        cur.idx.push(i);

        chars += len;

    }

    if (cur) {

        chunks.push(cur);

    }

    return chunks;

}


function liteBuildBody(chunk, subs, items, src, tgt) {

    const cues = chunk.idx.map(i => ({ id: i, text: items[i].text }));

    const first = chunk.idx[0];

    const last = chunk.idx[chunk.idx.length - 1];

    const before = [];

    const after = [];

    for (let k = Math.max(0, first - LITE.contextLines); k < first; k++) {

        before.push(liteStripTags(subs[k].text));

    }

    for (let k = last + 1; k <= Math.min(subs.length - 1, last + LITE.contextLines); k++) {

        after.push(liteStripTags(subs[k].text));

    }

    return {
        cues,
        prompt: chunk.snap.brief,
        src,
        tgt,
        memory: getMemoryExamples(LITE.memoryItems, cues.map(cue => ({ text: cue.text }))),
        context: {
            before: before.filter(Boolean),
            after: after.filter(Boolean)
        }
    };

}


/* ---------------------------------------------------------
   Chạy toàn bộ công việc dịch
   Trả về { wasAborted, fatalError, userEdits, doneCount, failed, flags }
   và điền translatedTexts[i] cho các dòng đã dịch.
--------------------------------------------------------- */

async function runLiteRouterJob(subs, translatedTexts, signal) {

    const outcome = {
        wasAborted: false,
        fatalError: null,
        userEdits: null,
        reused: 0
    };

    const total = subs.length;

    const src = sourceLanguage.value;

    const tgt = targetLanguage.value;

    const items = liteBuildItems(subs);

    // Bản sửa tay của người dùng (nếu đang có bản dịch) được giữ lại cho những dòng không dịch lại.
    if (
        translatedList.length === total &&
        translatedBaseline.length === total
    ) {

        const edits = {};

        let any = false;

        for (let i = 0; i < total; i++) {

            if (translatedList[i] !== translatedBaseline[i]) {

                edits[i] = translatedList[i];

                any = true;

            }

        }

        outcome.userEdits = any ? edits : null;

    }

    const sig = liteStructureSig(subs);

    let job = liteLoadJob();

    if (!job || job.sig !== sig || job.total !== total) {

        job = liteNewJob(sig, total);

    }

    const isDone = new Uint8Array(total);

    const flags = {};

    let doneCount = 0;

    let needTotal = 0;

    for (let i = 0; i < total; i++) {

        const item = items[i];

        if (!item.needs) {

            translatedTexts[i] = subs[i].text;

            if (item.skipFlag) {

                flags[i] = [item.skipFlag];

            }

            continue;

        }

        needTotal++;

        const entry = job.done[i];

        if (
            Array.isArray(entry) &&
            entry[0] === liteCueHash(subs[i].text, src, tgt) &&
            typeof entry[1] === 'string' &&
            entry[1]
        ) {

            translatedTexts[i] = entry[1];

            isDone[i] = 1;

            doneCount++;

            if (entry[2]) {

                flags[i] = entry[2].split(',').filter(Boolean);

            }

        } else if (entry) {

            delete job.done[i];

        }

    }

    outcome.reused = doneCount;

    const pending = [];

    for (let i = 0; i < total; i++) {

        if (items[i].needs && !isDone[i]) {

            pending.push(i);

        }

    }

    const redoneThisRun = new Set(pending);

    if (outcome.userEdits) {

        for (const key of Object.keys(outcome.userEdits)) {

            if (redoneThisRun.has(Number(key))) {

                delete outcome.userEdits[key];

            }

        }

        if (Object.keys(outcome.userEdits).length === 0) {

            outcome.userEdits = null;

        }

    }

    const maxCues = Math.max(1, Math.min(Number(batchSize.value) || LITE.maxCues, LITE.maxCues));

    const queue = litePlanChunks(pending, items, maxCues);

    const failedSet = new Set();

    let chunkNo = 0;

    let consecutiveFailures = 0;

    const setProgress = () => {

        const percent = needTotal === 0 ? 100 : Math.round((doneCount / needTotal) * 100);

        progressFill.style.width = percent + '%';

        progressText.textContent = percent + '% • ' + doneCount + '/' + needTotal + ' dòng';

    };

    setProgress();

    if (pending.length === 0) {

        showStatus(translationStatus, '✅ Dùng lại bản dịch đã lưu cho toàn bộ ' + needTotal + ' dòng.', 'success');

    }

    liteJobActive = true;

    await liteAcquireWakeLock();

    try {

        while (queue.length > 0) {

            if (signal.aborted) {

                outcome.wasAborted = true;

                break;

            }

            const chunk = queue.shift();

            chunkNo++;

            if (!chunk.snap) {

                chunk.snap = liteTakeSnapshot();

            }

            if (chunk.snap.brief.length > LITE.maxPromptChars) {

                outcome.fatalError = new LiteError(
                    'prompt_too_long',
                    'Prompt dài ' + chunk.snap.brief.length + ' ký tự, tối đa ' + LITE.maxPromptChars + '. Hãy rút gọn prompt.',
                    { fatal: true }
                );

                break;

            }

            showStatus(
                translationStatus,
                '🛰️ LiteRouter đang dịch lượt ' + chunkNo + '/' + (chunkNo + queue.length) +
                ' (' + chunk.idx.length + ' dòng)' +
                (chunk.attempts > 0 ? ' — thử lại lần ' + (chunk.attempts + 1) : '') + '...',
                'warning'
            );

            try {

                const data = await liteRequest(liteBuildBody(chunk, subs, items, src, tgt), signal);

                const wanted = new Set(chunk.idx);

                const got = new Set();

                for (const cue of data.cues) {

                    const i = Number(cue && cue.id);

                    if (!Number.isInteger(i) || !wanted.has(i) || got.has(i)) {

                        continue;

                    }

                    const final = normalizeSubText(
                        liteRestoreTags(typeof cue.text === 'string' ? cue.text : '', items[i].tags)
                    );

                    if (!final) {

                        continue;

                    }

                    got.add(i);

                    const cueFlags = Array.isArray(cue.flags)
                        ? cue.flags.filter(flag => typeof flag === 'string' && /^[a-z_]{1,24}$/.test(flag))
                        : [];

                    translatedTexts[i] = final;

                    isDone[i] = 1;

                    doneCount++;

                    if (cueFlags.length > 0) {

                        flags[i] = cueFlags;

                    } else {

                        delete flags[i];

                    }

                    job.done[i] = [
                        liteCueHash(subs[i].text, src, tgt),
                        final,
                        cueFlags.join(','),
                        chunk.snap.pid
                    ];

                }

                if (got.size === 0) {

                    throw new LiteError('empty_result', 'AI không trả về dòng hợp lệ nào.', { retryable: true });

                }

                consecutiveFailures = 0;

                const redo = chunk.idx.filter(i => !got.has(i));

                if (redo.length > 0) {

                    const next = { idx: redo, attempts: chunk.attempts + 1, snap: chunk.snap };

                    if (next.attempts >= LITE.attempts) {

                        redo.forEach(i => failedSet.add(i));

                    } else {

                        queue.unshift(next);

                    }

                }

                setProgress();

                liteSaveJob(job, false);

                await sleep(0);

            } catch (rawError) {

                if (rawError && rawError.name === 'AbortError') {

                    outcome.wasAborted = true;

                    break;

                }

                const error = rawError instanceof LiteError
                    ? rawError
                    : new LiteError('internal', (rawError && rawError.message) || 'Lỗi không xác định.', { fatal: true });

                if (error.fatal) {

                    outcome.fatalError = error;

                    break;

                }

                chunk.attempts++;

                const maxAttempts = error.code === 'rate_limited' ? LITE.rateLimitAttempts : LITE.attempts;

                const canSplit = chunk.idx.length > 1;

                if (canSplit && error.code !== 'rate_limited' && (error.shrink || chunk.attempts >= 2)) {

                    const mid = Math.ceil(chunk.idx.length / 2);

                    queue.unshift(
                        { idx: chunk.idx.slice(0, mid), attempts: 0, snap: chunk.snap },
                        { idx: chunk.idx.slice(mid), attempts: 0, snap: chunk.snap }
                    );

                    showStatus(
                        translationStatus,
                        '⚠️ ' + error.message + ' Đang chia lượt ' + chunk.idx.length + ' dòng thành 2 phần nhỏ hơn...',
                        'warning'
                    );

                    try {

                        await sleep(Math.min(8, error.retryAfter || 1) * 1000, signal);

                    } catch (sleepError) {

                        outcome.wasAborted = true;

                        break;

                    }

                    continue;

                }

                if ((error.retryable || error.shrink) && chunk.attempts < maxAttempts) {

                    const wait = Math.min(30, error.retryAfter || 2 * Math.pow(2, Math.min(chunk.attempts, 4) - 1));

                    showStatus(
                        translationStatus,
                        '⚠️ ' + error.message + ' Thử lại sau ' + wait + ' giây...',
                        'warning'
                    );

                    try {

                        await sleep(wait * 1000, signal);

                    } catch (sleepError) {

                        outcome.wasAborted = true;

                        break;

                    }

                    queue.unshift(chunk);

                    continue;

                }

                chunk.idx.forEach(i => failedSet.add(i));

                consecutiveFailures++;

                showStatus(
                    translationStatus,
                    '⚠️ Bỏ qua ' + chunk.idx.length + ' dòng (' + error.message + ') — giữ nguyên bản gốc.',
                    'warning'
                );

                if (consecutiveFailures >= LITE.breaker) {

                    outcome.fatalError = error;

                    break;

                }

            }

        }

    } finally {

        liteJobActive = false;

        liteReleaseWakeLock();

        liteSaveJob(job, true);

    }

    for (let i = 0; i < total; i++) {

        if (items[i].needs && !isDone[i]) {

            flags[i] = [failedSet.has(i) ? 'failed' : 'pending'];

        }

    }

    liteFlags = flags;

    outcome.doneCount = doneCount;

    outcome.needTotal = needTotal;

    outcome.failed = failedSet.size;

    return outcome;

}


function liteReviewCount() {

    let n = 0;

    for (const key of Object.keys(liteFlags)) {

        if (liteFlags[key].some(flag => LITE_FLAG_REVIEW.includes(flag))) {

            n++;

        }

    }

    return n;

}


function liteStatusSuffix() {

    const review = liteReviewCount();

    let text = '';

    if (review > 0) {

        text += ' ⚠️ ' + review + ' dòng AI đánh dấu cần kiểm tra (lọc “Cảnh báo” ở Bước 3).';

    }

    if (liteSaveFailed) {

        text += ' ℹ️ Trình duyệt không còn chỗ lưu tiến độ — tải SRT trước khi đóng trang.';

    }

    return text;

}


function bindLiteExtras() {

    [
        'translationMode',
        'translationStyle',
        'accuracyLevel',
        'sourceLanguage',
        'targetLanguage',
        'promptPreset'
    ].forEach(id => {

        const element = $(id);

        if (element) {

            element.addEventListener('change', () => {

                updatePromptCounter();

                liteRefreshResumeUI();

            });

        }

    });

    resetPromptBtn.addEventListener('click', updatePromptCounter);

}


liteDiscardBtn.addEventListener('click', liteDiscardProgress);

liteRedoBtn.addEventListener('click', liteRedoFlagged);

customPrompt.addEventListener('input', updatePromptCounter);

/* <<< LAYSRT:lite <<< */


/* >>> LAYSRT:stats >>> */

/* =========================================================
   THỐNG KÊ KHÁCH — bản 2
   - Không dùng Supabase SDK, không dùng Realtime: chỉ 1 lệnh gọi RPC
     (fetch) mỗi 60 giây khi trang đang hiện.
   - Khách MỚI chỉ được máy chủ ghi nhận (cả "đang online" lẫn tổng) sau khi
     trang đã hiện ≥ 8 giây VÀ có thao tác thật (chạm / bấm / gõ). Trước đó
     lệnh gọi chỉ để đọc số liệu, máy chủ không lưu gì. Khách đã được xác
     minh từ lần trước trên cùng trình duyệt thì được tính online ngay.
   - ID khách là chuỗi ngẫu nhiên lưu ở localStorage + cookie. Không lấy từ IP,
     không dùng vân tay trình duyệt.
   - Trình duyệt không lưu được ID (chặn cookie + localStorage) chỉ được
     tính "đang online", không tính vào tổng để tránh đếm trùng.
   - Chỉ dùng publishable key (gửi ở header apikey). Không có service_role.
========================================================= */

const STATS_V2 = {
    enabled: true,
    supabaseUrl: 'https://akitxcyugxkoirghysfx.supabase.co',
    publishableKey: 'sb_publishable_RWhw5AM-OQ0NebHC-4WhVw_vOGpaT8l',
    rpc: 'laysrt_ping',
    heartbeatMs: 60000,
    minVisibleMs: 8000,
    requestTimeoutMs: 10000,
    maxBackoffMs: 300000,
    minGapMs: 20000
};

const VISITOR_ID_KEY = 'laysrt_vid_v2';

const VISITOR_ID_KEY_V1 = 'laysrt_visitor_id_v1';

const VISITOR_COOKIE = 'laysrt_vid';

const VISITOR_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;


function statsRandomToken(bytes) {

    const arr = new Uint8Array(bytes);

    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {

        window.crypto.getRandomValues(arr);

    } else {

        for (let i = 0; i < bytes; i++) {

            arr[i] = Math.floor(Math.random() * 256);

        }

    }

    return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');

}


function statsReadCookie(name) {

    try {

        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));

        return match ? decodeURIComponent(match[1]) : '';

    } catch (error) {

        return '';

    }

}


function statsWriteCookie(name, value) {

    try {

        document.cookie =
            name + '=' + encodeURIComponent(value) +
            '; Max-Age=31536000; Path=/; SameSite=Lax' +
            (location.protocol === 'https:' ? '; Secure' : '');

    } catch (error) { /* bỏ qua */ }

}


// Trả về { id, persisted }. persisted=false nghĩa là không lưu được ở đâu cả.
function statsResolveVisitor() {

    let id = '';

    try {

        id = localStorage.getItem(VISITOR_ID_KEY) || '';

    } catch (error) { /* bị chặn */ }

    if (!VISITOR_ID_RE.test(id)) {

        id = statsReadCookie(VISITOR_COOKIE);

    }

    if (!VISITOR_ID_RE.test(id)) {

        // Giữ ID của bản cũ trên cùng trình duyệt để khách cũ không bị đếm 2 lần.
        try {

            id = localStorage.getItem(VISITOR_ID_KEY_V1) || '';

        } catch (error) { /* bị chặn */ }

    }

    if (!VISITOR_ID_RE.test(id)) {

        id = 'v2_' + statsRandomToken(16);

    }

    let storedLocal = false;

    try {

        localStorage.setItem(VISITOR_ID_KEY, id);

        storedLocal = localStorage.getItem(VISITOR_ID_KEY) === id;

    } catch (error) { /* bị chặn */ }

    statsWriteCookie(VISITOR_COOKIE, id);

    const storedCookie = statsReadCookie(VISITOR_COOKIE) === id;

    return { id, persisted: storedLocal || storedCookie };

}


// Chỉ nhận số thật từ máy chủ. null / chuỗi rỗng / số âm KHÔNG được hiện thành 0.
function statsNumber(value) {

    if (typeof value === 'number') {

        return value >= 0 ? value : NaN;

    }

    if (typeof value === 'string' && value.trim() !== '') {

        const n = Number(value);

        return n >= 0 ? n : NaN;

    }

    return NaN;

}


function setStatsValue(element, value) {

    if (element) {

        element.textContent = Number.isFinite(value) ? value.toLocaleString('vi-VN') : '—';

    }

}


const initVisitorStats = (function () {

    let visitor = null;

    let verified = false;

    let interacted = false;

    let visibleMs = 0;

    let visibleSince = 0;

    let inFlight = false;

    let inFlightVerified = false;

    let resendVerified = false;

    let failures = 0;

    let lastPingAt = 0;

    let timer = 0;

    let verifyTimer = 0;

    function nowMs() {

        return performance.now();

    }

    function currentVisibleMs() {

        return visibleMs + (visibleSince ? nowMs() - visibleSince : 0);

    }

    // Gửi đúng một lệnh gọi. Không bao giờ ném lỗi; trả về true nếu thành công.
    async function sendPing() {

        lastPingAt = Date.now();

        const controller = new AbortController();

        const abortTimer = setTimeout(() => controller.abort(), STATS_V2.requestTimeoutMs);

        try {

            const response = await fetch(
                STATS_V2.supabaseUrl + '/rest/v1/rpc/' + STATS_V2.rpc,
                {
                    method: 'POST',
                    headers: {
                        'apikey': STATS_V2.publishableKey,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        p_vid: visitor.id,
                        p_verified: verified,
                        p_ephemeral: !visitor.persisted
                    }),
                    cache: 'no-store',
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    signal: controller.signal
                }
            );

            if (!response.ok) {

                throw new Error('HTTP ' + response.status);

            }

            const data = await response.json();

            const total = statsNumber(data && data.total);

            const online = statsNumber(data && data.online);

            if (Number.isFinite(total)) {

                setStatsValue(totalVisitors, total);

            }

            if (Number.isFinite(online)) {

                setStatsValue(onlineVisitors, online);

            }

            failures = 0;

            return true;

        } catch (error) {

            failures++;

            return false;

        } finally {

            clearTimeout(abortTimer);

        }

    }

    async function ping() {

        if (inFlight) {

            // Đang có một lượt gửi chưa xong. Nếu lượt đó gửi "chưa xác minh" mà khách
            // vừa đủ điều kiện, nhớ lại để gửi bổ sung ngay khi lượt đó kết thúc
            // (không để mất lần xác minh đến tận nhịp tim kế tiếp).
            if (verified && !inFlightVerified) {

                resendVerified = true;

            }

            return;

        }

        inFlight = true;

        try {

            for (let round = 0; round < 2; round++) {

                resendVerified = false;

                inFlightVerified = verified;

                const ok = await sendPing();

                if (!ok || !resendVerified) {

                    break;

                }

            }

        } finally {

            inFlight = false;

            resendVerified = false;

        }

    }


    function nextDelay() {

        if (failures === 0) {

            return STATS_V2.heartbeatMs;

        }

        return Math.min(STATS_V2.maxBackoffMs, STATS_V2.heartbeatMs * Math.pow(2, failures));

    }

    function schedule() {

        clearTimeout(timer);

        if (document.visibilityState !== 'visible') {

            return;

        }

        timer = setTimeout(async () => {

            if (document.visibilityState === 'visible') {

                await ping();

            }

            schedule();

        }, nextDelay());

    }

    function checkVerified() {

        if (verified || !visitor) {

            return;

        }

        if (!interacted) {

            return;

        }

        const remaining = STATS_V2.minVisibleMs - currentVisibleMs();

        if (remaining > 0) {

            clearTimeout(verifyTimer);

            if (document.visibilityState === 'visible') {

                verifyTimer = setTimeout(checkVerified, remaining + 50);

            }

            return;

        }

        verified = true;

        clearTimeout(verifyTimer);

        ping().then(schedule);

    }

    function onInteraction(event) {

        if (event && event.isTrusted === false) {

            return;

        }

        if (!interacted) {

            interacted = true;

            ['pointerdown', 'touchstart', 'keydown', 'wheel', 'input'].forEach(name => {

                document.removeEventListener(name, onInteraction, true);

            });

        }

        checkVerified();

    }

    function onVisibility() {

        const t = nowMs();

        if (document.visibilityState === 'visible') {

            visibleSince = t;

            if (Date.now() - lastPingAt > STATS_V2.minGapMs) {

                ping().then(schedule);

            } else {

                schedule();

            }

            checkVerified();

        } else {

            if (visibleSince) {

                visibleMs += t - visibleSince;

                visibleSince = 0;

            }

            clearTimeout(timer);

            clearTimeout(verifyTimer);

        }

    }

    return function start() {

        if (!STATS_V2.enabled || !STATS_V2.supabaseUrl || !STATS_V2.publishableKey) {

            setStatsValue(totalVisitors, NaN);

            setStatsValue(onlineVisitors, NaN);

            return;

        }

        try {

            visitor = statsResolveVisitor();

        } catch (error) {

            visitor = { id: 'v2_' + statsRandomToken(16), persisted: false };

        }

        visibleSince = document.visibilityState === 'visible' ? nowMs() : 0;

        ['pointerdown', 'touchstart', 'keydown', 'wheel', 'input'].forEach(name => {

            document.addEventListener(name, onInteraction, { capture: true, passive: true });

        });

        document.addEventListener('visibilitychange', onVisibility);

        if (document.visibilityState === 'visible') {

            ping().then(schedule);

        }

    };

})();

/* <<< LAYSRT:stats <<< */


/* >>> LAYSRT:blocker >>> */

/* =========================================================
   CHẶN DEVTOOLS / ERUDA — bản 2
   Đây là lớp ngăn chặn ở frontend để gây khó cho việc mở công cụ kiểm
   tra và chép mã nguồn. KHÔNG phải bảo mật tuyệt đối: mã chạy trên trình
   duyệt của người dùng nên luôn có thể bị lấy bằng cách khác (xem nguồn,
   tải trực tiếp file, tắt JavaScript, công cụ dòng lệnh...).

   Khác bản cũ:
   - Chỉ khóa khi có tín hiệu MẠNH: Eruda/vConsole/Firebug xuất hiện, hoặc
     luồng bị dừng thật sự tại câu lệnh debugger. Bỏ phép đo chênh lệch
     kích thước cửa sổ (sai khi có sidebar, zoom, màn hình gập, chia đôi
     màn hình).
   - Đo debugger có "đo nền" + bỏ qua lượt khi luồng đang giật (máy yếu)
     hoặc tab bị ẩn, nên GC/giật máy không bị tính nhầm.
   - Không còn MutationObserver quét toàn trang: chỉ xem các node vừa
     được thêm vào <html>/<body>, và dùng selector theo id/class (nhanh).
   - KHÔNG hủy lượt dịch đang chạy khi khóa. Dịch/tải/sửa không bị hỏng.
   - Màn hình khóa có nút "kiểm tra lại" và tự mở khóa khi sạch.
   - Trạng thái nằm trong closure (không gõ được trong Console).
========================================================= */

const installDevtoolsProtection = (function () {

    let locked = false;

    let cleanStreak = 0;

    let lastTick = 0;

    let timer = 0;

    const TICK_MS = 2000;

    const JANK_MS = 700;

    const PAUSE_MS = 90;

    const BASE_MS = 25;

    const REQUIRED_CLEAN = 2;

    const TOOL_SIGNATURE = /eruda|firebug|vconsole/i;

    const TOOL_SELECTOR = '#eruda,.eruda-container,#__vconsole,.vc-switch,.vc-panel';

    function noop() {}

    /* ---- Lớp 1: công cụ có trong trang ---- */
    function toolInPage() {

        if (window.eruda || window.Firebug || window.__VCONSOLE__) {

            return true;

        }

        if (document.querySelector(TOOL_SELECTOR)) {

            return true;

        }

        const scripts = document.scripts;

        for (let i = 0; i < scripts.length; i++) {

            const src = scripts[i].src || '';

            if (src && TOOL_SIGNATURE.test(src)) {

                return true;

            }

        }

        return false;

    }

    function nodeLooksLikeTool(node) {

        if (!node || node.nodeType !== 1) {

            return false;

        }

        if (TOOL_SIGNATURE.test(node.id || '')) {

            return true;

        }

        const cls = typeof node.className === 'string' ? node.className : '';

        if (cls && TOOL_SIGNATURE.test(cls)) {

            return true;

        }

        return node.tagName === 'SCRIPT' && TOOL_SIGNATURE.test(node.src || '');

    }

    /* ---- Lớp 2: luồng bị dừng thật tại debugger ---- */
    function probeOnce() {

        const a = performance.now();

        noop();

        const b = performance.now();

        // eslint-disable-next-line no-debugger
        debugger;

        const c = performance.now();

        return { base: b - a, paused: c - b };

    }

    function debuggerPaused() {

        const first = probeOnce();

        if (first.base > BASE_MS || first.paused < PAUSE_MS) {

            return false;

        }

        const second = probeOnce();

        return second.base <= BASE_MS && second.paused >= PAUSE_MS;

    }

    /* ---- Khóa / mở khóa ---- */
    function lock() {

        if (!devtoolsBlocker || locked) {

            return;

        }

        locked = true;

        cleanStreak = 0;

        const el = document.activeElement;

        if (el && el !== document.body && typeof el.blur === 'function') {

            el.blur();

        }

        const app = document.querySelector('.container');

        if (app) {

            app.inert = true;

        }

        devtoolsBlocker.classList.add('active');

        devtoolsBlocker.setAttribute('aria-hidden', 'false');

        document.documentElement.classList.add('devtools-locked');

    }

    function unlock() {

        if (!devtoolsBlocker || !locked) {

            return;

        }

        locked = false;

        cleanStreak = 0;

        const app = document.querySelector('.container');

        if (app) {

            app.inert = false;

        }

        devtoolsBlocker.classList.remove('active');

        devtoolsBlocker.setAttribute('aria-hidden', 'true');

        document.documentElement.classList.remove('devtools-locked');

    }

    /* ---- Một chu kỳ kiểm tra ---- */
    function cycle(allowProbe, immediateUnlock) {

        let strong = toolInPage();

        if (!strong && allowProbe && document.visibilityState === 'visible') {

            strong = debuggerPaused();

        }

        if (strong) {

            // Chu kỳ sạch phải liên tiếp: thấy lại công cụ thì đếm lại từ đầu.
            cleanStreak = 0;

            lock();

            return;

        }

        if (locked) {

            cleanStreak++;

            if (immediateUnlock || cleanStreak >= REQUIRED_CLEAN) {

                unlock();

            }

        }

    }

    function tick() {

        clearTimeout(timer);

        const now = performance.now();

        // Luồng bị trễ nhiều so với hẹn = máy đang giật hoặc tab vừa bị làm chậm:
        // bỏ qua phép đo debugger lần này để không báo nhầm.
        const jank = lastTick !== 0 && now - lastTick - TICK_MS > JANK_MS;

        lastTick = now;

        if (document.visibilityState === 'visible') {

            cycle(!jank, false);

        }

        timer = setTimeout(tick, TICK_MS);

    }

    function bindStaticGuards() {

        document.addEventListener('contextmenu', event => {

            const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';

            if (tag === 'input' || tag === 'textarea' || tag === 'select') {

                return;

            }

            event.preventDefault();

        }, { capture: true });

        document.addEventListener('keydown', event => {

            const key = String(event.key || '').toLowerCase();

            const ctrlOrMeta = event.ctrlKey || event.metaKey;

            const blocked =
                key === 'f12' ||
                (ctrlOrMeta && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
                (ctrlOrMeta && key === 'u');

            if (blocked) {

                event.preventDefault();

                event.stopPropagation();

            }

        }, { capture: true });

    }

    function bindDynamicChecks() {

        const observer = new MutationObserver(records => {

            for (const record of records) {

                for (const node of record.addedNodes) {

                    if (nodeLooksLikeTool(node)) {

                        lock();

                        return;

                    }

                }

            }

        });

        observer.observe(document.documentElement, { childList: true });

        if (document.body) {

            observer.observe(document.body, { childList: true });

        }

        document.addEventListener('visibilitychange', () => {

            if (document.visibilityState === 'visible') {

                lastTick = 0;

                clearTimeout(timer);

                timer = setTimeout(tick, 400);

            } else {

                clearTimeout(timer);

            }

        });

        const recheck = $('devtoolsRecheckBtn');

        if (recheck) {

            recheck.addEventListener('click', () => {

                lastTick = 0;

                cycle(true, true);

            });

        }

    }

    return function start() {

        bindStaticGuards();

        bindDynamicChecks();

        cycle(false, false);

        timer = setTimeout(tick, 600);

    };

})();

/* <<< LAYSRT:blocker <<< */


/* =========================================================
   SETTINGS — nhớ lựa chọn giữa các lần mở (KHÔNG lưu API key)
========================================================= */

const SETTINGS_FIELDS = [
    'translationMethod',
    'sourceLanguage',
    'targetLanguage',
    'translationMode',
    'translationStyle',
    'accuracyLevel',
    'batchSize',
    'promptPreset',
    'customPrompt',
    'geminiModel',
    'geminiThinking',
    'groqModel',
    'deepseekModel',
    'deepseekReasoning',
    'openaiModel',
    'openaiReasoning',
    'openrouterModel'
];

let settingsTimer = null;


function saveSettings() {

    try {

        const data = {
            activeDictionary: activeDictionary
        };

        SETTINGS_FIELDS.forEach(id => {

            const element = $(id);

            if (element) {
                data[id] = element.value;
            }

        });

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));

    } catch {}

}


function saveSettingsSoon() {

    clearTimeout(settingsTimer);

    settingsTimer = setTimeout(saveSettings, 300);

}


// Trả về true nếu đã khôi phục nội dung prompt (khi đó không nạp lại prompt mẫu).
function restoreSettings() {

    let data = null;

    try {

        data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');

    } catch {}

    if (!data || typeof data !== 'object') {
        return false;
    }

    SETTINGS_FIELDS.forEach(id => {

        const element = $(id);

        if (!element || typeof data[id] !== 'string') {
            return;
        }

        if (
            element.tagName === 'SELECT' &&
            !Array.from(element.options).some(option => option.value === data[id])
        ) {
            return;
        }

        if (element.tagName === 'INPUT' && !data[id].trim()) {
            return;
        }

        element.value = data[id];

    });

    if (data.activeDictionary && data.activeDictionary !== activeDictionary) {

        dictionaryCards.forEach(card => {

            if (card.dataset.category === data.activeDictionary) {
                card.click();
            }

        });

    }

    return (
        typeof data.customPrompt === 'string' &&
        data.customPrompt.trim() !== ''
    );

}


function bindSettingsPersistence() {

    SETTINGS_FIELDS.forEach(id => {

        const element = $(id);

        if (!element) {
            return;
        }

        element.addEventListener('change', saveSettingsSoon);

        element.addEventListener('input', saveSettingsSoon);

    });

    dictionaryCards.forEach(card => {
        card.addEventListener('click', saveSettingsSoon);
    });

    resetPromptBtn.addEventListener('click', saveSettingsSoon);

}


// Dán/gõ tên model trên điện thoại dễ thừa khoảng trắng → trim khi rời ô.
function bindModelInputs() {

    [
        'geminiModel',
        'groqModel',
        'deepseekModel',
        'openaiModel',
        'openrouterModel'
    ].forEach(id => {

        const element = $(id);

        if (!element) {
            return;
        }

        element.addEventListener('blur', () => {
            element.value = element.value.trim();
        });

    });

}


// Đang dịch mà tải lại/đóng trang sẽ mất kết quả chưa lưu.
window.addEventListener('beforeunload', event => {

    if (translationRunning || hasUnsavedWork()) {

        event.preventDefault();

        event.returnValue = '';

    }

});


/* =========================================================
   INITIALIZE
========================================================= */

loadMemory();

if (!restoreSettings()) {
    loadPromptPreset();
}

bindModelInputs();

bindSettingsPersistence();

bindLiteExtras();

updateTranslationUI();

showOriginalPreview();

installDevtoolsProtection();
initVisitorStats();

