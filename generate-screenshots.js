const puppeteer = require('puppeteer')

const selectors = {
    search: 'input[placeholder="Type any URL to view annotations and comments"]',
    addTag: 'input[placeholder="Add tag"]',
    closeGuide: '.Header_closeGuide_32snu',
}
const f = async () => {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    // page.on('console', msg => {
    //     // for (let i = 0; i < msg.args().length; ++i) {
    //     //     console.log(`${i}: ${msg.args()[i]}`)
    //     // }
    //     console.log(msg.text())
    // })
    await page.setViewport({ width: 1020, height: 1100, deviceScaleFactor: 2 })

    console.log('generating home.png')
    await page.goto('https://localhost:8080')
    await page.screenshot({ path: 'public/screenshots/home.png' })
    await page.click(selectors.closeGuide)

    console.log('generating sandbox.png')
    await page.goto('https://localhost:8080/sandbox-abc')
    await page.screenshot({ path: 'public/screenshots/sandbox.png', clip: { x: 0, y: 0, width: 1100, height: 440 } })

    console.log('generating alex.png')
    await page.goto(`https://localhost:8080/t/${encodeURIComponent('https://www.infowars.com/judge-questions-global-warming-evidence-in-climate-change-trial')}`)
    // await page.waitFor(500)
    await page.screenshot({ path: 'public/screenshots/alex.png', fullPage: true })

    console.log('generating poll.png')
    await page.goto('https://localhost:8080/@tkoen/human-activity-is-causing-global-warming')
    await page.waitFor(10000)
    await page.click('.fa-comment')
    await page.screenshot({ path: 'public/screenshots/poll.png' })

    console.log('generating poll-hover.png')
    await page.click('.fa-thumbs-up')
    await page.evaluate(() => {
        window.setTestUsername('abc')
    })
    await page.click('.fa-thumbs-down')
    await page.hover('.BaseNode_root_1Gwd7')
    await new Promise(resolve => setTimeout(resolve, 500))
    await page.screenshot({ path: 'public/screenshots/poll-hover.png', clip: { x: 200, y: 70, width: 700, height: 185 } })

    console.log('generating poll-results.png')
    await page.click('.BaseNode_results_1zevA')
    await page.waitFor(200)
    await page.screenshot({ path: 'public/screenshots/poll-results.png', clip: { x: 200, y: 70, width: 700, height: 230 } })

    console.log('generating poll-votes.png')
    await page.waitFor(200)
    const [viewVotes] = await page.$x("//div[contains(., 'View comments')]")
    await page.screenshot({ path: 'public/screenshots/poll-votes0.png' })
    if (viewVotes) {
        // console.log(viewVotes)
        await viewVotes.click()
    }
    // await page.waitForSelector('.BaseNode_viewComments_21scm')
    // // await page.click('.BaseNode_viewComments_21scm')
    await page.waitFor(500)
    await page.screenshot({ path: 'public/screenshots/poll-votes.png' })

    console.log('generating poll-yin-yang.png')
    await page.click('.Comments_views_1FcB3')
    await page.waitFor(500)
    await page.screenshot({ path: 'public/screenshots/poll-yin-yang.png', clip: { x: 0, y: 300, width: 1100, height: 500 } })

    console.log('generating post-poll.png')
    const searchInput = await page.$(selectors.search)
    await searchInput.type('Human activity is causing global warming', { delay: 20 })
    const unitSelect = await page.$('.ChooseNode_unitSelect_51T4M')
    await unitSelect.click()
    await new Promise(resolve => setTimeout(resolve, 100))
    const unitItem = await page.$('.el-select-dropdown__item')
    await unitItem.click()
    const tagInput = await page.$(selectors.addTag)
    await tagInput.type('science', { delay: 20 })
    await tagInput.press('Enter')
    const postButton = await page.$('.ChooseNode_postButton_1iivf')
    // await postButton.hover()
    await page.screenshot({ path: 'public/screenshots/post-poll.png', clip: { x: 200, y: 0, width: 700, height: 210 } })
    await page.waitFor(500)
    await postButton.click()

    console.log('generating webpage-searching.png')
    await page.setViewport({ width: 1100, height: 400, deviceScaleFactor: 2 })
    const input = await page.$(selectors.search)
    await input.type('http://www.aaronsw.com/weblog/hatethenews', { delay: 20 })
    await input.press('Enter')
    await page.waitForNavigation({ timeout: 5000 })
    await page.screenshot({ path: 'public/screenshots/webpage-searching.png' })

    console.log('generating webpage.png')
    await page.click('body')
    await page.waitForSelector('.rectangle', { timeout: 15000 })
    await page.hover('.rectangle')
    await new Promise(resolve => setTimeout(resolve, 500))
    await page.screenshot({ path: 'public/screenshots/webpage.png' })

    console.log('generating annotation-comments.png')
    await page.click('.fa-link')
    await new Promise(resolve => setTimeout(resolve, 500))
    await page.screenshot({ path: 'public/screenshots/annotation-comments.png' })

    await browser.close()
}

f()
