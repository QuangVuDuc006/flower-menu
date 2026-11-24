const { chromium } = require(process.env.FLOWER_QA_NODE_MODULES || require('path').join(process.env.TEMP, 'flower-qa/node_modules/playwright'));
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({channel:'msedge', headless:true});
 const page = await browser.newPage();
 await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('tests/screenshots',{recursive:true});
 for (const width of [375,390,768,1024,1440]) {
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:5173');
  await page.locator('h1').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
  await page.screenshot({path:`tests/screenshots/catalog-${width}.png`,fullPage:true});
 }
 const search=page.getByPlaceholder('Tìm tên hoa hoặc mã mẫu...');
 await search.fill('zzzz-no-match');
 assert(await page.getByText(/không tìm thấy/i).count());
 await search.fill('');
 await page.getByRole('button',{name:/^Hoa giỏ/}).click();
 assert.equal(await page.getByText('Hồng Dịu Dàng',{exact:true}).count(),0);
 assert(await page.getByText('Giỏ Hoa Bình Yên',{exact:true}).count());
 await page.goto('http://127.0.0.1:5173/flowers/BH-001');
 for(const width of [390,1440]) {
 await page.setViewportSize({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`tests/screenshots/detail-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:/Sao chép mã/}).click();
 await page.getByText('Đã sao chép mã mẫu BH-001', { exact: true }).waitFor();
 assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'BH-001');
 await page.goto('http://127.0.0.1:5173/admin');
 await page.getByRole('button',{name:'Mở bản quản trị demo',exact:true}).click();
 await page.getByRole('heading',{name:'Danh sách mẫu hoa'}).waitFor();
 for (const width of [375,390,768,1024,1440]) {
 await page.setViewportSize({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Admin overflow ${width}`);
 await page.screenshot({path:`tests/screenshots/admin-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Thêm mẫu hoa',exact:true}).click();
 for(const width of [390,1440]) {
 await page.setViewportSize({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`tests/screenshots/form-${width}.png`,fullPage:true});
 }
 const upload=page.locator('input[type=file]');
 await upload.setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});
 await page.getByText(/JPG, PNG/).waitFor();
 await upload.setInputFiles('public/flowers/placeholder.png');
 await page.locator('img[src^="data:image"]').first().waitFor();
 assert(await page.locator('img[src^="data:image"]').first().evaluate(img=>img.complete&&img.naturalWidth>0));
 await page.getByLabel('Tên mẫu hoa *',{exact:true}).fill('Hoa kiểm thử');
 await page.getByLabel('Giá bán (VNĐ) *',{exact:true}).fill('500000');
 await page.getByRole('button',{name:'Dùng ảnh mẫu thử nghiệm'}).click();
 await page.locator('button[title]').first().click();
 await page.getByRole('button',{name:'Lưu mẫu hoa',exact:true}).click();
 await page.getByRole('heading',{name:'Danh sách mẫu hoa'}).waitFor();
 assert(await page.getByText('Hoa kiểm thử',{exact:true}).count());
 await page.getByRole('button',{name:'Chỉnh sửa',exact:true}).last().click();
 await page.getByLabel('Tên mẫu hoa *',{exact:true}).fill('Hoa đã sửa');
 await page.getByRole('button',{name:'Lưu mẫu hoa',exact:true}).click();
 await page.getByRole('heading',{name:'Danh sách mẫu hoa'}).waitFor();
 assert(await page.getByText('Hoa đã sửa',{exact:true}).count());
 page.on('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:/^Ẩn/}).last().click();
 const modalConfirm = page.getByRole('button',{name:'Ẩn mẫu hoa',exact:true});
 if (await modalConfirm.isVisible({timeout: 1000}).catch(()=>false)) {
  await modalConfirm.click();
 }
 assert(await page.getByRole('button',{name:/^Hiện/}).count() >= 2);
 console.log('PASS responsive catalog/admin/detail/forms, category/search, copy, demo login, invalid/valid upload, add/edit/hide',errors);
 assert.deepEqual(errors,[]);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
