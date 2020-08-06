# 사업자 등록 번호 유효성 검증

## webhook test

1. 센트리: 서버에서 오류가 나면 알람을 준다.
   홈텍스에서 조회가 안되면 알람이 온다.

2. 람다를 서버에서 조회하는 방법 찾아보기

## OverView

유효한 사업자 등록 번호 검증 로직입니다.  
검증 단계는 아래와 같습니다.

1. 사업자 등록번호 생성패턴 검증
2. [홈택스 사업자등록상태조회](https://www.hometax.go.kr/websquare/websquare.wq?w2xPath=/ui/pp/index_pp.xml)

## 사용법

### 응답예시

```js
// 사용자등록번호 패턴이 잘못된 경우
{ "status": false, "message": "유효하지 않은 사업자등록번호입니다." }

// 운영중인 사업장의 경우
{ "status": true, "message": "부가가치세 일반과세자 입니다." }

// 폐업자의 경우
{
  "status": false,
  "message": "폐업자 (과세유형: 부가가치세 일반과세자, 폐업일자:2020-05-26) 입니다."
}

// 운영중이지 않은 경우
{
  "status": false,
  "message": "사업을 하지 않고 있습니다."
}
```

## 검증 절차

### 1. 생성 패턴 검증

- 사업자 등록번호의 생성패턴을 검증한다.
- [참고](http://www.devholic.net/1000507)

### 2. 사업장 운영여부 검증 (홈텍스)

홈텍스의 사업자등록상태조회 서비스를 스크래핑하여 사업장의 상태를 조회합니다.

#### 요청 예시

```xml
<map id="ATTABZAA001R08">
    <pubcUserNo/>
    <mobYn>N</mobYn>
    <inqrTrgtClCd>1</inqrTrgtClCd>
    <txprDscmNo>1234567890</txprDscmNo>
    <dongCode>45</dongCode>
    <psbSearch>Y</psbSearch>
    <map id="userReqInfoVO"/>
</map>
```

`txprDscmNo`은 사업자등록번호, `dongCode`은 사업자등록번호에서 3,4번째 자리수인 동번호를 의미합니다.  
실제 요청에서는 `txprDscmNo`만 제대로 입력하면 요청이 정상처리 됩니다.

#### 응답 예시

```xml
<map id='resultMsg' >
    <detailMsg></detailMsg>
    <msg></msg>
    <code></code>
    <result>S</result>
    <trtEndCd>Y</trtEndCd>
    <smpcBmanEnglTrtCntn>The business registration number is registered</smpcBmanEnglTrtCntn>
    <nrgtTxprYn>N</nrgtTxprYn>
    <smpcBmanTrtCntn>등록되어 있는 사업자등록번호 입니다. </smpcBmanTrtCntn>
    <trtCntn>부가가치세 일반과세자 입니다.</trtCntn>
</map>
```

#### 5초 제한

홈텍스에서 응답 간격을 5초로 제한하고 있습니다.  
이 문제에 대해서는 아직 명확한 해결방법이 없습니다. 요청 데이터의 포멧에 따라 5초 제한이 여부가 달라집니다.

## 테스트 데이터

```js
const testNumberList = [
  7048801152,
  7138800666,
  2713100076,
  1331022851,
  6618700621,
  1058796554, // 폐업(싸이월드)
  3051577349,
  1198679111,
  1168200276,
  1070151850,
  2218301195,
  2218301194, // 잘못된 사업자 번호
];
```

## 참고

1. [람다](https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/getting-started-create-function.html5)
2. [공정거래 위원회](https://www.ftc.go.kr/www/bizCommList.do?key=232)
3. [홈텍스](https://teht.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/ab/a/a/UTEABAAA13.xml)
4. [다트](https://opendart.fss.or.kr/intro/main.do)
5. [케이리포트](http://www.kreport.co.kr/)
6. [BIZNO](https://www.bizno.net/?query=%ED%9B%A0%EA%B6%88%EC%95%BC)

## 사업자증록상태조회 스크래핑

1. [사업자등록상태조회 프로그램 만들기](https://medium.com/@kam6512/%EC%82%AC%EC%97%85%EC%9E%90%EB%93%B1%EB%A1%9D%EC%83%81%ED%83%9C-%EC%9E%90%EB%8F%99%EC%A1%B0%ED%9A%8C-%EB%A7%8C%EB%93%A4%EA%B8%B0-770e9914abf1)
2. [사업자등록상태조회 프로그램 만들기2](https://twinmoon.tistory.com/5)
