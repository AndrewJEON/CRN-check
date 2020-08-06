const axios = require("axios");
const xml2js = require("xml2js");

const createResponse = (status, body) => ({
  statusCode: status,
  body: JSON.stringify(body),
});

/**
 * @description 사업자 등록 번호 패턴 검증
 * @param {number} crn 사업자 등록 번호
 */
const checkPattern = function (crn) {
  // 인증키
  const key = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  // 넘어온 값의 정수만 추츨하여 문자열의 배열로 만들고 10자리 숫자인지 확인합니다.
  const bizNumberArr = (crn + "").match(/\d{1}/g);
  if (bizNumberArr.length !== 10) {
    return false;
  }
  const lastNum = parseInt(bizNumberArr[bizNumberArr.length - 1], 10);

  // 0 ~ 8 까지 9개의 숫자를 체크키와 곱하여 합에더합니다.
  let sum = key.reduce((prev, cur, idx) => {
    prev += cur * parseInt(bizNumberArr[idx], 10);

    return prev;
  }, 0);

  // 각 8번배열의 값을 곱한 후 10으로 나누고 내림하여 기존 합에 더합니다.
  // 다시 10의 나머지를 구한후 그 값을 10에서 빼면 이것이 검증번호 이며 기존 검증번호와 비교하면됩니다.
  const chkSum = Math.floor((key[8] * parseInt(bizNumberArr[8], 10)) / 10);
  // 체크섬 합계에 더해줌
  sum += chkSum;

  const reminder = (10 - (sum % 10)) % 10;

  //값 비교

  if (reminder === lastNum) {
    return true;
  }

  return false;
};

/**
 * xml을 파싱해서 반환한다.
 * @param {string} dataString
 */
const xmlToObject = (dataString) =>
  new Promise((resolve, reject) => {
    xml2js.parseString(
      dataString, // API 응답의 'data' 에 지정된 xml 값 추출, 파싱
      (err, res) => {
        if (err) reject(err);
        else resolve(res); // trtCntn 이라는 TAG 의 값을 get
      }
    );
  });

/**
 * @description hometax에서 사업자 등록 번호를 확인한다.
 * @param {number} crn 사업자 등록번호
 * @return {Promise<Object>}
 * {
 *  status: boolean;
 *  message: string;
 * }
 */
const checkHomeTex = async (crn) => {
  // 홈택스 사업자번호 인증 타임아웃
  const TIMEOUT = 2000;
  // 국세청 사업자번호 조회 API
  const HOMETAX_URL =
    "https://teht.hometax.go.kr/wqAction.do?actionId=ATTABZAA001R08&screenId=UTEABAAA13&popupYn=false&realScreenId=";

  const RESULT = {
    status: false,
    message: "",
  };
  try {
    const dongCode = ("" + crn).slice(3, 5);

    // TODO: 5초 락에 걸린다.
    /*    let xmlRaw = "";
    xmlRaw += '<map id="ATTABZAA001R08">';
    xmlRaw += "<pubcUserNo/>";
    xmlRaw += "<mobYn>N</mobYn>";
    xmlRaw += "<inqrTrgtClCd>1</inqrTrgtClCd>";
    xmlRaw += `<txprDscmNo>${crn}</txprDscmNo>`;
    xmlRaw += `<dongCode>${dongCode}</dongCode>`;
    xmlRaw += "<psbSearch>N</psbSearch>";
    xmlRaw += '<map id="userReqInfoVO"/>';
    xmlRaw += "</map>"; */

    // TODO: 이렇게 보내면 5초 검증을 무시한다... 이유가?????
    // API 에 raw 로 올라갈 xml 데이터
    const xmlRaw =
      '<map id="ATTABZAA001R08"><pubcUserNo/><mobYn>N</mobYn><inqrTrgtClCd>1</inqrTrgtClCd><txprDscmNo>{CRN}</txprDscmNo><dongCode>15</dongCode><psbSearch>Y</psbSearch><map id="userReqInfoVO"/></map>';

    const response = await axios.post(
      HOMETAX_URL,
      // xmlRaw,
      xmlRaw.replace(/\{CRN\}/, crn), // xml 데이터에 사업자등록번호를 추가
      {
        headers: {
          "Content-Type": "text/xml",
          // Host: "teht.hometax.go.kr",
          // Origin: "https://teht.hometax.go.kr",
          // "Sec-Fetch-Mode": "cors",
          // "Sec-Fetch-Site": "same-origin",
          // Reffer:
          //   "https://teht.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/ab/a/a/UTEABAAA13.xml",
          // "User-Agent": random_useragent.getRandom(), // gets a random user agent string
        },
        timeout: TIMEOUT,
      }
    );
    if (response.status === 200 && response.statusText === "OK") {
      const data = await xmlToObject(response.data);

      const {
        map,
        // nrgtTxprYn, // 의미가?
        // smpcBmanEnglTrtCntn, // 영어 메세지
        // smpcBmanTrtCntn,
        trtEndCd, // 의미가?
        trtCntn,
      } = data.map;

      if (trtEndCd[0] === "N") {
        // 5초 검증
        throw new Error(map[0].msg[0]);
      }

      RESULT.message = trtCntn[0];

      const stateMap = {
        type1: "사업을 하지 않고 있습니다.",
        type2: "폐업자", //폐업자 (과세유형: 부가가치세 과특사업자, 폐업일자:1994-12-30) 입니다.
        type3: "부가가치세 일반과세자 입니다.",
        type4: "부가가치세 면세사업자 입니다.",
        type5: "부가가치세 간이과세자 입니다.",
      };
      // 폐업을 했거나, 사업을 하지 않는 경우.
      const wrongCase = [stateMap.type1, stateMap.type2].some((item) =>
        RESULT.message.includes(item)
      );

      if (!wrongCase) {
        RESULT.status = true;
      }
    } else {
      // 2020.0806: 홈텍스 서버 에러, 홈텍스 검증을 건너뛰고 패턴검증만 한다.
      // throw new Error(response);

      RESULT.status = true;
      RESULT.message = "유효한 사업자등록번호입니다";
    }
  } catch (e) {
    RESULT.message = e.message;
  } finally {
    return RESULT;
  }
};

/**
 * @description 최종 실행함수
 * @param {number} CRNumber
 */
exports.handler = async (event, context, callback) => {
  console.log("\n", "\n");
  console.log("===PARAM===", event.num);
  console.log("\n", "\n");
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  const RESULT = {
    status: false,
    message: "",
  };
  const CRNumber = event.num;
  // 유효성 검증

  try {
    if (!CRNumber) {
      throw new Error(`사업자등록번호를 입력하십시오..`);
    } else if (!checkPattern(CRNumber)) {
      throw new Error("유효하지 않은 사업자등록번호입니다.");
    } else {
      const hometaxResponse = await checkHomeTex(CRNumber);

      if (!hometaxResponse.status) {
        throw new Error(hometaxResponse.message);
      } else {
        RESULT.message = hometaxResponse.message;
        RESULT.status = true;
      }
    }
  } catch (e) {
    // console.error(e);
    RESULT.message = e.message;
  } finally {
    callback(
      null,
      createResponse(200, { ...RESULT, test: "AWS... Lambda...." })
    );
  }
};
