import {exec, execSync} from 'child_process'
import consoleLog from './utils/console-log'
import tryPush from './utils/try-push'
import build from './utils/build'
import find from 'find'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import mkdirp from 'mkdirp'

const hasChanges = (path) => {
    // 先看看status对不对
    const gitStatus = execSync(`cd ${path};git status`)
    if (gitStatus.indexOf('nothing to commit, working directory clean') > -1) {
        consoleLog(`没有修改`, 'grey', path)
        return false
    } else {
        return true
    }
}

const getModulePath = (info) => {
    return `./lib/${info.categoryName}/${info.module.path}`
}

const deleteLib = (info) => {
    execSync(`rm -rf ${getModulePath(info)}/lib`)
}

// 根据路径 处理 .d.ts 文件
const resolveDtsFromPath = (filePath, dirPath, info, rootPath) => {
    if (!fs.existsSync(filePath)) return

    let fileContent = fs.readFileSync(filePath).toString()
    fileContent = fitDts(fileContent, info, dirPath, rootPath)
    fs.writeFileSync(filePath, fileContent)
}

// 加工 .d.ts
const fitDts = (content, info, filePath, rootPath) => {
    // 移除 scss 引用
    content = content.replace(/import\s+\'[.\/\w-]+.((css|scss|less)\';?)/g, '')

    /**
     * 将引用的模块 copy 过来,并且修改绝对路径
     * 内部模块不执行,因为会同步到仓库中,而使项目中出现重复定义的 bug
     */
    if (info.categoryInfo.access === 'public') {
        content = autoTypings(content, info, filePath, rootPath)
    }

    return content
}

/**
 * 创建 auto-typings 将根目录的 typings 复制到每个文件中
 */
const autoTypings = (content, info, filePath, rootPath)=> {
    const filePathArray = filePath.split('/')
    if (filePathArray[filePathArray.length - 1] === 'lib' && filePathArray[filePathArray.length - 2] === info.module.path) {
        // 根目录
        // 删除所有 tsd的引用
        content = content.replace(/\/\/\/\s*\<reference\s*path=\"[..\/]*typings\/tsd\.d\.ts\"\s*\/\>/g, '')
    } else {
        // 将 reference 引用到相对路径
        let contentArray = content.split('\n')
        contentArray = contentArray.map((line)=> {
            if (line.indexOf('/// <reference') > -1) {
                // 先取到path中的内容 example: ../../../../../typings-module/css-animation.d.ts
                const referencePath = _.trim(line.match(/"[^"]*"/g)[0], '"')
                const referencePathArray = referencePath.split('/')
                const autoTypingsPath = path.join(rootPath, 'auto-typings')
                const referenceName = referencePathArray[referencePathArray.length - 1]
                // 读取该文件内容
                const referenceContent = fs.readFileSync(path.join(filePath, referencePath))
                // 如果根目录没有 auto-typings 文件夹,则创建
                if (!fs.existsSync(autoTypingsPath)) {
                    mkdirp.sync(autoTypingsPath)
                }
                // 在 auto-typings 目录下创建这个依赖文件
                fs.writeFileSync(path.join(autoTypingsPath, referenceName), referenceContent.toString())
                /**
                 * 修正内容中的依赖路径
                 * */
                    // 判断 filePath 与 rootPath 的距离
                const filePathDeepRootPathIndex = filePath.split('/').length - rootPath.split('/').length
                // 距离为 0 的情况
                let relativePath = './'
                if (filePathDeepRootPathIndex > 0) {
                    relativePath = _.repeat('../', filePathDeepRootPathIndex)
                }
                line = `/// <reference path="${relativePath}auto-typings/${referenceName}" />`
            }
            return line
        })
        content = contentArray.join('\n')
    }

    return content
}

const createDTs = (info) => {
    const tsxPath = `./lib/${info.categoryName}/${info.module.path}`

    if (fs.existsSync(tsxPath + '/src/index.tsx')) {
        if (fs.existsSync(tsxPath)) {
            execSync(`tsc -d --experimentalDecorators --jsx preserve --t es6 -m commonjs --outDir ${tsxPath}/lib  ${tsxPath}/src/index.tsx`)
        }
    } else {
        // js 文件暂时拷贝过去
        execSync(`cp -r ${tsxPath}/src ${tsxPath}/lib`)
    }
}

const parseDTs = (info) => {
    // 搜索 lib 所有文件夹
    const moduleDistRoot = path.join(__dirname, '../..', `lib/${info.categoryName}/${info.module.path}/lib`)
    const moduleDirPaths = find.dirSync(moduleDistRoot)

    // 不处理没有 tsx 的目录
    if (!fs.existsSync(path.join(__dirname, '../..', `lib/${info.categoryName}/${info.module.path}/src/index.tsx`))) {
        return
    }

    // 处理 d.ts
    resolveDtsFromPath(`${moduleDistRoot}/index.d.ts`, moduleDistRoot, info, moduleDistRoot)
    moduleDirPaths.map((moduleDirPath) => {
        resolveDtsFromPath(`${moduleDirPath}/index.d.ts`, moduleDirPath, info, moduleDistRoot)
        resolveDtsFromPath(`${moduleDirPath}/module.d.ts`, moduleDirPath + '/module', info, moduleDistRoot)
    })
}

const syncCnpm = (info) => {
    consoleLog(`cnpm 开始同步..`, 'grey', getModulePath(info))
    exec(`cnpm sync ${info.categoryInfo.prefix}-${info.module.path}`, (err) => {
        if (err) {
            consoleLog(err.toString(), 'red', getModulePath(info))
        }
        consoleLog(`cnpm 同步成功`, 'green', getModulePath(info))
    })
}

const publish = (info) => {
    execSync(`cd lib/${info.categoryName}/${info.module.path};npm publish`)
}

export default (info, message) => {
    // 是否有修改
    const hasChange = hasChanges(getModulePath(info))

    if (hasChange) {
        // 先删除 lib 目录
        deleteLib(info)

        // typescript 编译
        createDTs(info)

        // 加工 d.ts
        parseDTs(info)

        // babel sass 编译
        consoleLog('正在编译..', 'grey', getModulePath(info))
        let modulePath = `./lib/${info.categoryName}/${info.module.path}/lib`
        build(info, modulePath)
        consoleLog('编译完成', 'green', getModulePath(info))

        // 如果是开放模块,发布 npm
        if (info.categoryInfo.access === 'public') {
            consoleLog('发布中..', 'grey', getModulePath(info))
            publish(info)
            consoleLog('发布完成', 'green', getModulePath(info))
        }

        // 如果是开放模块,删除 lib 目录
        // 私有模块因为通过内部平台直接安装,源码需要保存 lib 目录
        if (info.categoryInfo.access === 'public') {
            deleteLib(info)
        }

        // 如果是开放模块,通知 cnpm 更新
        if (info.categoryInfo.access === 'public') {
            syncCnpm(info)
        }

        // try push
        consoleLog('正在提交代码..', 'grey', getModulePath(info))
        tryPush(getModulePath(info), message)
        consoleLog('提交代码成功..', 'grey', getModulePath(info))
    }

    // 如果是开放模块,删除 lib目录
    if (info.categoryInfo.access === 'public') {
        deleteLib(info)
    }
}