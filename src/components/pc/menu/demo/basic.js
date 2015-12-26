import React from 'react'
import { Menu, SubMenu, MenuItem } from 'fit-menu'

export default class Demo extends React.Component {
    handleClick() {
        console.log('菜单基础用法,点击')
    }

    render() {
        return (
            <Menu style={{height:100}}>
                <MenuItem brand style={{width:100}} to="/">组件库</MenuItem>
                <MenuItem to="/input">输入框组件</MenuItem>
                <MenuItem onClick={this.handleClick.bind(this)}>任意事件</MenuItem>
            </Menu>
        )
    }
}