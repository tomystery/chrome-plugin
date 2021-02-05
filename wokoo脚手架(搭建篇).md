## 油猴插件 & wokoo脚手架使用说明

一款油猴插件的脚手架。如果直接开发油猴插件，开发者需要费时搭建vue或react基础项目，还需要对油猴脚本区域做对应的配置，开发体验差。

wokoo可以一键式生成基础项目，并且提供基础Tampermonkey配置。

主要提供的功能有：

- 命令行式创建脚手架初始项目
- 根据用户选择，生成vue、react的基本项目
- tampermonkey.js 文件中提供Tampermonkey配置

关于油猴插件和wokoo的具体使用可以阅读 [5分钟上手开发浏览器插件——油猴脚手架wokoo](https://juejin.cn/post/6922815205575491597)

这里是wokoo脚手架代码：[wokoo脚手架github仓库](https://github.com/kinyaying/wokoo)

我使用wokoo开发了[MoveSearch](https://greasyfork.org/zh-CN/scripts/421189-movesearch)（划词搜索插件），欢迎大家使用

![movesearch](https://gitee.com/zhufengpeixun/browser-plugin/raw/master/img/movesearch.gif)

wokoo脚手架的设计参考了[create-react-app](https://github.com/facebook/create-react-app)，我也曾经写过一篇分析cra源码的文章，感兴趣的同学可以阅读这篇👉[create-react-app核心源码解读](https://juejin.cn/post/6916531902773985294)。



## 手把手教搭建过程

- lerna: 进行项目管理
- wokoo-scripts: 和用户交互，拉取 wokoo-template，生成对应的初始项目
- wokoo-template: 提供模板来初始化一个有基础配置的油猴项目。模板有两种：react 和 vue

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cf77f0701b274c7483a0d6aaba207640~tplv-k3u1fbpfcp-watermark.image?imageslim)

1. 安装lerna

```shell
npm i lerna -g
```

2. 创建项目目录，初始化

```shell
mkdir wokoo
cd wokoo
lerna init
```

3. 开启workspace，在package.json中增加`workspaces`配置

```
"workspaces": [
	"packages/*"
],
```

4. 创建子项目

```shell
lerna create wokoo-scripts
lerna create wokoo-template
```

## wokoo-scripts编写

wokoo-scripts的主要功能有：

- commander 获取shell中用户键入的projectName
- fs.writeFile创建文件路径
- 安装wokoo-template模板
- 读取模板指定后缀文件.md, .js，将ejs语法进行替换
- 删除多余内容
- 卸载模板

**1.创建入口**

进入`packages/wokoo-scripts`，创建`bin/www`文件

```js
#! /usr/bin/env node

require('../index.js');
```

修改package.json，增加`bin`字段配置

```json
 "bin": {
    "wokoo": "./bin/www"
  }
```

在wokoo-scripts下创建index.js文件作为项目入口。

**2.安装依赖模块**

介绍下用到的第三方模块：

- [chalk](https://www.npmjs.com/package/chalk) 粉笔，丰富控制台显示的字颜色

- [cross-spawn](https://www.npmjs.com/package/cross-spawn) 开启子线程

- [commander](https://www.npmjs.com/package/commander) 解析命令行中的命令

- [fs-extra](https://www.npmjs.com/package/fs-extra)  操作文件

- [inquirer](https://www.npmjs.com/package/inquirer)  交互式命令行工具，有他就可以实现命令行的选择功能
- [metalsmith](https://www.npmjs.com/package/metalsmith)  读取所有文件,实现模板渲染

- [consolidate](https://www.npmjs.com/package/consolidate) 统一模板引擎

安装依赖，添加软链

```shell
npm install chalk cross-spawn commander fs-extra inquirer metalsmith consolidate ejs  -S
npm link
```

**3.实现init方法，读取命令行指令**

主要使用[commander](https://www.npmjs.com/package/commander)来读取命令行中用户输入的项目名，此时在命令行执行`wokoo my-app`，能够在代码中获取到项目名my-app

```js
const chalk = require('chalk')
const spawn = require('cross-spawn')
const { Command } = require('commander')
const fs = require('fs-extra')
const path = require('path')
const inquirer = require('inquirer')
const packageJson = require('./package.json')

let program = new Command()
init()
// 程序入口，读取命令行脚本，获得项目名称
async function init() {
  let projectName
  program
    .version(packageJson.version)
    .arguments('<project-directory>') // 项目目录名 参数格式：<必选> [可选]
    .usage(`${chalk.green(`<project-directory>`)}`)
    .action((name) => {
      projectName = name
      console.log('projectName:', projectName)
    })
    .parse(process.argv) // [node路径，脚本路径，参数]
}
```

**4.createApp方法，根据项目名生成项目**

在run方法中调createApp方法，传入projectName。createApp主要实现了创建文件夹，写入package.json的功能。

```js
async function createApp(appName) {
  let root = path.resolve(appName) // 要生成的项目的绝对路径
  fs.ensureDirSync(appName) // 没有则创建文件夹
  console.log(`create a new app in ${chalk.green(root)}`)
  // 初始化package.json
  const packageJson = {
    name: appName,
    version: '0.0.1',
    private: true,
    scripts: {
      start: 'cross-env NODE_ENV=development webpack serve',
      build: 'webpack',
    },
  }
  // 写入package.json
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )
  // 改变工作目录，进入项目目录
  process.chdir(root)
}
```

**5. run：复制项目模板到当前项目下，生成基础项目**

createApp最后要调用run方法。run主要做了以下几点👇：

1. 安装wokoo-template

```js
const templateName = 'wokoo-template' // 对应的wokoo模板
const allDependencies = [templateName]
// 安装wokoo-template包
console.log('Installing packages. This might take a couple of minutes')
console.log(`Installing ${chalk.cyan(templateName)} ...`)
try {
  await doAction(root, allDependencies)
} catch (e) {
  console.log(`Installing ${chalk.red(templateName)} failed ...`, e)
}
```

2. 根据用户选择的模板类型复制相应模板文件到临时文件夹temp，替换其中的ejs模板，然后删除临时文件夹temp

```js
// 选择模板
  const repos = ['vue', 'react']
  const { targetTemplate } = await inquirer.prompt({
    name: 'targetTemplate',
    type: 'list',
    message: 'which template do you prefer?',
    choices: repos, // 选择模式
  })

  const templatePath = path.dirname(
    require.resolve(`${templateName}/package.json`, { paths: [root] })
  )

  // 复制文件到项目目录
  const scriptsConfigDir = path.join(templatePath, 'webpack.config.js')
  const gitIgnoreDir = path.join(templatePath, '.npmignore')
  const publicDir = path.join(templatePath, 'public')
  const tempDir = path.join(root, 'temp') // 临时模板路径
  const templateDir = path.join(templatePath, `${targetTemplate}-template`)
  // 从wokoo-template中拷贝模板到项目目录
  if (fs.existsSync(templatePath)) {
    // 将templateDir内模板拷贝到temp文件，并修改模板文件中的ejs配置项
    await modifyTemplate(templateDir, 'temp', {
      projectName: appName,
      basicProject: targetTemplate,
    })

    fs.copySync(tempDir, root) // 源 目标
    fs.copySync(publicDir, root + '/public')
    fs.copyFileSync(scriptsConfigDir, root + '/webpack.config.js')
    fs.copyFileSync(gitIgnoreDir, root + '/.gitignore')
    deleteFolder(tempDir)
  } else {
    console.error(
      `Could not locate supplied template: ${chalk.green(templatePath)}`
    )
    return
  }
```

此处，我将复制的功能封装到modifyTemplate.js中。利用MetalSmith提供的方法遍历源路径下文件，利用consolidate.ejs将文件中的ejs语法替换后，将内容写入新的临时文件夹temp中。

```js
const MetalSmith = require('metalsmith') // 遍历文件夹
let { render } = require('consolidate').ejs
const { promisify } = require('util')
const path = require('path')
render = promisify(render) // 包装渲染方法

/**
 *
 * @param {*} fromPath 源路径
 * @param {*} toPath 目标路径
 */
async function handleTemplate(fromPath, toPath, config) {
  await new Promise((resovle, reject) => {
    MetalSmith(__dirname)
      .source(fromPath) // 遍历下载的目录
      .destination(path.join(path.resolve(), toPath)) // 输出渲染后的结果
      .use(async (files, metal, done) => {
        // result 替换模板内数据
        let result = {
          license: 'MIT',
          version: '0.0.1',
          ...config,
        }
        const data = metal.metadata()
        Object.assign(data, result) // 将询问的结果放到metadata中保证在下一个中间件中可以获取到
        done()
      })
      .use((files, metal, done) => {
        Reflect.ownKeys(files).forEach(async (file) => {
          let content = files[file].contents.toString() // 获取文件中的内容
          if (
            file.includes('.js') ||
            file.includes('.json') ||
            file.includes('.txt') ||
            file.includes('.md')
          ) {
            // 如果是md或者txt才有可能是模板
            if (content.includes('<%')) {
              // 文件中用<% 我才需要编译
              content = await render(content, metal.metadata()) // 用数据渲染模板
              files[file].contents = Buffer.from(content) // 渲染好的结果替换即可
            }
          }
        })
        done()
      })
      .build((err) => {
        // 执行中间件
        if (!err) {
          resovle()
        } else {
          reject(err)
        }
      })
  })
}

module.exports = handleTemplate
```

3. 合并template.json和package.json，生成新的package.json并再次执行`npm install`

```js
// 合并template.json和package.json
  let tempPkg = fs.readFileSync(root + '/template.json').toString()
  let pkg = fs.readFileSync(root + '/package.json').toString()
  const tempPkgJson = JSON.parse(tempPkg)
  const pkgJson = JSON.parse(pkg)

  pkgJson.dependencies = {
    ...pkgJson.dependencies,
    ...tempPkgJson.package.dependencies,
  }
  pkgJson.devDependencies = {
    ...tempPkgJson.package.devDependencies,
  }
  // 编写package.json
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(pkgJson, null, 2)
  )
  fs.unlinkSync(path.join(root, 'template.json')) // 删除template.json文件

  // 再次根据dependenciesToInstall执行npm install
  const dependenciesToInstall = Object.entries({
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  })
  let newDependencies = []
  if (dependenciesToInstall.length) {
    newDependencies = newDependencies.concat(
      dependenciesToInstall.map(([dependency, version]) => {
        return `${dependency}@${version}`
      })
    )
  }
  await doAction(root, newDependencies)
  console.log(`${chalk.cyan('Installing succeed!')}`)
```

4. 卸载wokoo-template

   ```js
   await doAction(root, 'wokoo-template', 'uninstall')
   ```

   

流程上的实现介绍完了，下面两个方法是我封装的功能性方法

**doAction：使用npm安装或卸载项目依赖**

使用[cross-spawn](https://www.npmjs.com/package/cross-spawn)开启子线程，在子线程中执行`npm install` 或 `npm uninstall`的命令

```js
async function doAction(root, allDependencies, action = 'install') {
  typeof allDependencies === 'string'
    ? (allDependencies = [allDependencies])
    : null
  return new Promise((resolve) => {
    const command = 'npm'
    const args = [
      action,
      '--save',
      '--save-exact',
      '--loglevel',
      'error',
      ...allDependencies,
      '--cwd',
      root,
    ]
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('close', resolve) // 安装成功后触发resolve
  })
}

```

**deleteFolder: 递归删除文件、文件夹，入参是path文件路径**

```js
function deleteFolder(path) {
  let files = []
  if (fs.existsSync(path)) {
    if (!fs.statSync(path).isDirectory()) {
      // path是文件，直接删除
      fs.unlinkSync(path)
    } else {
      // 删除文件夹
      files = fs.readdirSync(path)
      files.forEach(function (file) {
        let curPath = path + '/' + file
        deleteFolder(curPath)
      })
      fs.rmdirSync(path)
    }
  }
}
```

## wokoo-template编写

- 分为vue-template和react-template
- vue-template和react-template分别对应webpack配置的一个vue或react基础项目
- 使用ejs模板，实现wokoo-scripts注入变量

template相对来说比较简单，使用webpack+vue或react分别搭建了一个轻量级项目。

具体代码可看👉[wokoo/wokoo-template](https://github.com/kinyaying/wokoo/tree/master/packages/wokoo-template)

## 发布

在执行`lerna publish`之前，先看下自己的项目下用到的文件或文件夹是否在package.json `files`字段中。只有在files中的文件或文件夹才会真正的被发布上去。

1. 在wokoo-scripts的package.json的`files`字段中增加"modifyTemplate.js"
2. 在wokoo-template的package.json的`files`字段中增加"react-template", "vue-template","public","webpack.config.js",".gitignore"

我之前就忘记往files字段添加，导致publish上去后发现丢文件了。具有问题可阅读：https://stackoverflow.com/questions/27049192/npm-publish-isnt-including-all-my-files

最后一步就大功告成了！🎉

```shell
lerna publish
```

## 使用

```shell
npm i wokoo -g
wokoo my-app
```

具体使用过程可以阅读[油猴脚手架wokoo使用说明](https://juejin.cn/post/6922815205575491597)

都读到这里了，给你鼓个掌吧👏👏👏

