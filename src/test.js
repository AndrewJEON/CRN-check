const { handler } = require("./checkCRN");

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

testNumberList.forEach(
  (num, idx) =>
    handler({ num }, null, (meta, re) => {
      console.log(re);
    })
  // .then((re) => console.log(idx, re))
  // .catch((err) => console.log(idx, err))
);
