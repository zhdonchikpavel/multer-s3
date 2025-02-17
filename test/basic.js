/* eslint-env mocha */

var multerS3 = require("../");

var fs = require("fs");
var path = require("path");
var extend = require("xtend");
var assert = require("assert");
var multer = require("multer");
var stream = require("stream");
var FormData = require("form-data");
var onFinished = require("on-finished");

var mockClient = require("aws-sdk-client-mock").mockClient;
var S3Client = require("@aws-sdk/client-s3").S3Client;

var VALID_OPTIONS = {
  bucket: "string",
};

var INVALID_OPTIONS = [
  ["numeric key", { key: 1337 }],
  ["string key", { key: "string" }],
  ["numeric bucket", { bucket: 1337 }],
  ["numeric contentType", { contentType: 1337 }],
];

function submitForm(multer, form, cb) {
  form.getLength(function (err, length) {
    if (err) return cb(err);

    var req = new stream.PassThrough();

    req.complete = false;
    form.once("end", function () {
      req.complete = true;
    });

    form.pipe(req);
    req.headers = {
      "content-type": "multipart/form-data; boundary=" + form.getBoundary(),
      "content-length": length,
    };

    multer(req, null, function (err) {
      onFinished(req, function () {
        cb(err, req);
      });
    });
  });
}

describe("Multer S3", function () {
  let mockS3;
  let client;

  beforeEach(function () {
    mockS3 = mockClient(S3Client);
    client = new S3Client({});
  });

  it("is exposed as a function", function () {
    assert.equal(typeof multerS3, "function");
  });

  INVALID_OPTIONS.forEach(function (testCase) {
    it("throws when given " + testCase[0], function () {
      function testBody() {
        multerS3(extend(VALID_OPTIONS, testCase[1]));
      }

      assert.throws(testBody, TypeError);
    });
  });

  it("upload files", function (done) {
    var form = new FormData();
    var storage = multerS3({ s3: client, bucket: "test" });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );
    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.ok(req.file.location.startsWith('https://test.s3'));
      assert.ok(req.file.location.endsWith(req.file.key));
      assert.true

      done();
    });
  });

  it("uploads file with AES256 server-side encryption", function (done) {
    var form = new FormData();
    var storage = multerS3({
      s3: client,
      bucket: "test",
      serverSideEncryption: "AES256",
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.ok(req.file.location.startsWith('https://test.s3'));
      assert.ok(req.file.location.endsWith(req.file.key));
      assert.equal(req.file.serverSideEncryption, "AES256");

      done();
    });
  });

  it("uploads file with AWS KMS-managed server-side encryption", function (done) {
    
    var form = new FormData();
    var storage = multerS3({
      s3: client,
      bucket: "test",
      serverSideEncryption: "aws:kms",
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.ok(req.file.location.startsWith('https://test.s3'));
      assert.ok(req.file.location.endsWith(req.file.key));
      assert.equal(req.file.serverSideEncryption, "aws:kms");

      done();
    });
  });

  it("uploads PNG file with correct content-type", function (done) {
    var form = new FormData();
    var storage = multerS3({
      s3: client,
      bucket: "test",
      serverSideEncryption: "aws:kms",
      contentType: multerS3.AUTO_CONTENT_TYPE,
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.contentType, "image/png");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.size, 68);
      assert.equal(req.file.bucket, "test");
      assert.ok(req.file.location.startsWith('https://test.s3'));
      assert.ok(req.file.location.endsWith(req.file.key));
      assert.equal(req.file.serverSideEncryption, "aws:kms");

      done();
    });
  });

  it("uploads SVG file with correct content-type", function (done) {
    var form = new FormData();
    var storage = multerS3({
      s3: client,
      bucket: "test",
      serverSideEncryption: "aws:kms",
      contentType: multerS3.AUTO_CONTENT_TYPE,
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(path.join(__dirname, "files", "test.svg"));

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");

      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.contentType, "image/svg+xml");
      assert.equal(req.file.originalname, "test.svg");
      assert.equal(req.file.size, 100);
      assert.equal(req.file.bucket, "test");
      assert.ok(req.file.location.startsWith('https://test.s3'));
      assert.ok(req.file.location.endsWith(req.file.key));
      assert.equal(req.file.serverSideEncryption, "aws:kms");

      done();
    });
  });

  it("upload transformed files", function (done) {
    var form = new FormData();
    var storage = multerS3({
      s3: client,
      bucket: "test",
      shouldTransform: true,
      transforms: [
        {
          key: "test",
          transform: function (req, file, cb) {
            cb(null, new stream.PassThrough());
          },
        },
        {
          key: "test2",
          transform: function (req, file, cb) {
            cb(null, new stream.PassThrough());
          },
        },
      ],
    });
    var upload = multer({ storage: storage });
    var parser = upload.single("image");
    var image = fs.createReadStream(
      path.join(__dirname, "files", "ffffff.png")
    );

    form.append("name", "Multer");
    form.append("image", image);

    submitForm(parser, form, function (err, req) {
      assert.ifError(err);

      assert.equal(req.body.name, "Multer");
      assert.equal(req.file.fieldname, "image");
      assert.equal(req.file.originalname, "ffffff.png");
      assert.equal(req.file.transforms[0].size, 68);
      assert.equal(req.file.transforms[0].bucket, "test");
      assert.equal(req.file.transforms[0].key, "test");
      assert.ok(req.file.transforms[0].location.startsWith('https://test.s3'));
      assert.ok(req.file.transforms[0].location.endsWith(req.file.transforms[0].key));
      assert.equal(req.file.transforms[1].key, "test2");
      assert.ok(req.file.transforms[1].location.endsWith(req.file.transforms[1].key));

      done();
    });
  });
});
