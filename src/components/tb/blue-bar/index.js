
                import React from 'react'
                import CodeView from '../../../../components/code-view'
                import Highlight from 'react-highlight'
                import { Row, Col } from 'fit-layout'
                import Title from '../../../../components/title'
                import readme from '../../../../lib/tb/blue-bar/readme.md'
                import '../../../../lib/tb/blue-bar/demo'

                
                    import BasicComponent from 'react-hot-loader!babel?presets[]=react,presets[]=es2015!../../../../lib/tb/blue-bar/demo/lists/basic.js'
                    import BasicCode from 'text!../../../../lib/tb/blue-bar/demo/lists/basic.js'
                    import BasicMarkdown from '../../../../lib/tb/blue-bar/demo/lists/basic.md'
                    
                    import ShareComponent from 'react-hot-loader!babel?presets[]=react,presets[]=es2015!../../../../lib/tb/blue-bar/demo/lists/share.js'
                    import ShareCode from 'text!../../../../lib/tb/blue-bar/demo/lists/share.js'
                    import ShareMarkdown from '../../../../lib/tb/blue-bar/demo/lists/share.md'
                    

                const colStyle = {
                    padding: 10
                }

                export default class DemoBox extends React.Component {
                    constructor(props) {
                        super(props)
                        this.state = {}
                        document.title = '顶部蓝条'
                    }

                    render() {
                        return (
                            <div className="_namespace">
                                <Title>{readme}</Title>

                                <Row>
                                    
                    <Col span="12" style={colStyle}>
                        <CodeView md={BasicMarkdown} code={BasicCode}>
                            <BasicComponent/>
                        </CodeView>
                    </Col>
                    
                    <Col span="12" style={colStyle}>
                        <CodeView md={ShareMarkdown} code={ShareCode}>
                            <ShareComponent/>
                        </CodeView>
                    </Col>
                    
                                </Row>

                            </div>
                        )
                    }
                }
                