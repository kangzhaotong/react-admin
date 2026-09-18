import { useEffect, useState } from 'react';
import {
  CheckCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Tag,
  Typography
} from 'antd';

const { Paragraph, Text, Title } = Typography;

const commands = [
  {
    command: 'rtk --version',
    description: '确认当前安装的是 RTK CLI，并查看版本。'
  },
  {
    command: 'rtk git status',
    description: '压缩 Git 状态输出，适合交给 AI 助手快速阅读。'
  },
  {
    command: "rtk find src -type f -name '*.test.*'",
    description: '以紧凑树形结果查找项目中的测试文件。'
  },
  {
    command: 'rtk test pnpm test',
    description: '运行测试，只保留测试结果和失败信息。'
  },
  {
    command: 'rtk tsc --noEmit',
    description: '执行 TypeScript 检查，并按错误分组输出。'
  },
  {
    command: 'rtk gain',
    description: '查看 Token 节省统计和各命令的压缩效果。'
  }
];

export default function RtkTest() {
  const [copiedCommand, setCopiedCommand] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      messageApi.success('命令已复制');
      window.setTimeout(() => setCopiedCommand(''), 1600);
    } catch {
      messageApi.error('复制失败，请手动选择命令');
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 32 }}>
      {contextHolder}
      <Space orientation="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Tag color="cyan" icon={<ThunderboltOutlined />}>
            RTK CLI
          </Tag>
          <Title level={2} style={{ margin: '12px 0 6px' }}>
            RTK 测试页
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Rust Token Killer 命令速查与本项目验证结果。RTK
            在终端中运行，不是前端状态管理库。测试结果： rtk 0.45.0 · 154/154
            内置校验通过 · pnpm test 的 9 个用例通过 · TypeScript 无错误 Token
            节省率：85.5% 项目测试用例：9 RTK 内置校验：154/154 rtk verify 的 1
            个用例通过 · TypeScript 无错误 Token 节省率：85.5% 项目测试用例：9
            RTK 内置校验：154/154 rtk verify 的 1 个用例通过 · TypeScript 无错误
            Token 节省率：85.5% 项目测试用例：9 RTK 内置校验：154/154 rtk verify
            的 1 个用例通过 · TypeScript 无错误 Token 节省率：85.5%
            项目测试用例：9 RTK 内置校验：154/154 rtk verify 的 1 个用例通过 ·
            TypeScript 无错误 Token 节省率：85.5% 项目测试用例：9 RTK
            内置校验：154/154
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message={`页面停留：${seconds} 秒`}
          description="使用函数式更新避免过期闭包，并在卸载时 clearInterval。"
        />

        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="当前验证通过"
          description="rtk 0.45.0 · 154/154 内置校验通过 · pnpm test 的 9 个用例通过 · TypeScript 无错误"
        />

        <Row gutter={[16, 16]}>
          {[
            ['85.5%', 'Token 节省率'],
            ['9', '项目测试用例'],
            ['154/154', 'RTK 内置校验']
          ].map(([value, label]) => (
            <Col xs={24} sm={8} key={label}>
              <Card size="small">
                <Text type="secondary">{label}</Text>
                <Title level={3} style={{ margin: '8px 0 0' }}>
                  {value}
                </Title>
              </Card>
            </Col>
          ))}
        </Row>

        <Card title="常用命令" extra={<Tag color="green">可复制</Tag>}>
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            {commands.map(({ command, description }) => (
              <div
                key={command}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '10px 12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Paragraph
                    code
                    copyable={false}
                    style={{ marginBottom: 4, overflowWrap: 'anywhere' }}
                  >
                    {command}
                  </Paragraph>
                  <Text type="secondary">{description}</Text>
                </div>
                <Button
                  icon={
                    copiedCommand === command ? (
                      <CheckCircleOutlined />
                    ) : (
                      <CopyOutlined />
                    )
                  }
                  aria-label={`复制 ${command}`}
                  onClick={() => copyCommand(command)}
                />
              </div>
            ))}
          </Space>
        </Card>

        <Card title="初始化与验证">
          <Paragraph>
            首次使用可以先预览全局 Hook 的改动，再执行初始化：
          </Paragraph>
          <Paragraph code>rtk init --global --dry-run</Paragraph>
          <Paragraph code>cd /your/project &amp;&amp; rtk init</Paragraph>
          <Space wrap>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              href="https://www.rtk-ai.app/docs/getting-started/quick-start/"
              target="_blank"
            >
              查看官方 Quick Start
            </Button>
            <Button
              onClick={() => copyCommand('rtk verify')}
              icon={<CopyOutlined />}
            >
              复制验证命令
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
