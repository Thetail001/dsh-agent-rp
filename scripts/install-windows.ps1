[CmdletBinding()]
param(
  [string]$DshVersion = 'latest',
  [string]$PluginSource = 'github:hewzhew/dsh-agent-rp#main',
  [string]$Registry,
  [switch]$ChinaMirror,
  [switch]$Start
)

$ErrorActionPreference = 'Stop'
$pluginPackageName = '@dsh-external/dsh-agent-rp'
$minimumPnpmMajor = 11
$previousRegistry = $env:npm_config_registry

function Write-Stage {
  param(
    [int]$Current,
    [int]$Total,
    [string]$Message
  )
  Write-Host "[$Current/$Total] $Message" -ForegroundColor Cyan
}

function Read-SemanticVersion {
  param(
    [string]$Value,
    [string]$CommandName
  )
  if ($Value -notmatch '(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)') {
    throw "无法识别 $CommandName 返回的版本：$Value"
  }
  return [pscustomobject]@{
    Major = [int]$Matches.major
    Minor = [int]$Matches.minor
    Patch = [int]$Matches.patch
    Text = $Matches[0]
  }
}

function Read-JsonFile {
  param([string]$Path)
  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    throw "无法读取 $Path：$($_.Exception.Message)"
  }
}

function Get-DependencySpec {
  param(
    [object]$Manifest,
    [string]$PackageName
  )
  if ($null -eq $Manifest.dependencies) { return $null }
  $property = $Manifest.dependencies.PSObject.Properties | Where-Object Name -EQ $PackageName | Select-Object -First 1
  if ($null -eq $property) { return $null }
  return [string]$property.Value
}

function Invoke-PnpmDlx {
  param([string[]]$Arguments)
  & pnpm dlx --reporter append-only @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm 执行失败（退出码 $LASTEXITCODE）"
  }
}

try {
  if ($ChinaMirror -and -not [string]::IsNullOrWhiteSpace($Registry)) {
    throw 'ChinaMirror 与 Registry 不能同时使用；请选择一个 registry 来源。'
  }
  if ($ChinaMirror) {
    $Registry = 'https://registry.npmmirror.com'
  }
  if (-not [string]::IsNullOrWhiteSpace($Registry)) {
    $registryUri = $null
    if (-not [Uri]::TryCreate($Registry, [UriKind]::Absolute, [ref]$registryUri) -or $registryUri.Scheme -notin @('http', 'https')) {
      throw "Registry 必须是完整的 HTTP(S) 地址：$Registry"
    }
    $env:npm_config_registry = $Registry.TrimEnd('/')
  }

  Write-Stage 1 4 '检查 Node.js、pnpm 与本机数据目录'
  if ($null -eq (Get-Command node -ErrorAction SilentlyContinue)) {
    throw '没有找到 Node.js。请先安装 Node.js 22.19+ 或 24+，再重新运行。'
  }
  $nodeVersion = Read-SemanticVersion (& node --version) 'Node.js'
  $supportedNode = ($nodeVersion.Major -eq 22 -and $nodeVersion.Minor -ge 19) -or $nodeVersion.Major -ge 24
  if (-not $supportedNode) {
    throw "当前 Node.js 为 $($nodeVersion.Text)；DSH 需要 Node.js 22.19+ 或 24+（Node 23 不在支持范围）。"
  }

  if ($null -eq (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw '没有找到 pnpm。请先运行 npm install --global pnpm@11，再重新运行；安装器不会静默修改全局工具。'
  }
  $pnpmVersion = Read-SemanticVersion (& pnpm --version) 'pnpm'
  if ($pnpmVersion.Major -lt $minimumPnpmMajor) {
    throw "当前 pnpm 为 $($pnpmVersion.Text)；请先运行 npm install --global pnpm@11。"
  }

  $dshHomePath = if ([string]::IsNullOrWhiteSpace($env:DSH_HOME)) {
    Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh'
  } else {
    $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($env:DSH_HOME)
  }
  $profileManifestPath = Join-Path $dshHomePath 'profiles\web\package.json'
  $legacyPluginPath = Join-Path $dshHomePath 'plugins\dsh-agent-rp'
  Write-Host "    Node.js $($nodeVersion.Text) · pnpm $($pnpmVersion.Text)"
  Write-Host "    DSH 数据目录：$dshHomePath"
  if (-not [string]::IsNullOrWhiteSpace($Registry)) {
    Write-Host "    本次使用 registry：$env:npm_config_registry"
  }
  if (Test-Path -LiteralPath $legacyPluginPath) {
    Write-Warning "发现旧安装目录 $legacyPluginPath。安装器不会删除它；若 DSH 启动日志仍引用这里，请先把该目录移出 plugins 后再启动。"
  }

  $normalizedDshVersion = $DshVersion.Trim().TrimStart('@')
  if ([string]::IsNullOrWhiteSpace($normalizedDshVersion)) { throw 'DshVersion 不能为空。' }
  if ([string]::IsNullOrWhiteSpace($PluginSource)) { throw 'PluginSource 不能为空。' }
  $dshRunner = "@deepseek-ai/dsh@$normalizedDshVersion"

  Write-Stage 2 4 "准备 DSH runner（$dshRunner）"
  Invoke-PnpmDlx @($dshRunner, '--version')

  $installedSpec = $null
  if (Test-Path -LiteralPath $profileManifestPath) {
    $installedSpec = Get-DependencySpec (Read-JsonFile $profileManifestPath) $pluginPackageName
  }
  if ($null -eq $installedSpec) {
    Write-Stage 3 4 '安装 Agent RP'
    Invoke-PnpmDlx @($dshRunner, 'plugin', '--profile', 'web', 'add', $PluginSource)
  } elseif ($installedSpec -eq $PluginSource) {
    Write-Stage 3 4 "更新 Agent RP（当前来源：$installedSpec）"
    Invoke-PnpmDlx @($dshRunner, 'plugin', '--profile', 'web', 'update', $pluginPackageName)
  } else {
    Write-Stage 3 4 "同步 Agent RP 来源（当前：$installedSpec）"
    Invoke-PnpmDlx @($dshRunner, 'plugin', '--profile', 'web', 'add', $PluginSource)
  }

  Write-Stage 4 4 '验证 web profile 与插件入口'
  if (-not (Test-Path -LiteralPath $profileManifestPath)) {
    throw "没有生成 web profile：$profileManifestPath"
  }
  $profileManifest = Read-JsonFile $profileManifestPath
  if ($null -eq (Get-DependencySpec $profileManifest $pluginPackageName)) {
    throw "web profile 中没有找到 $pluginPackageName"
  }
  $bundles = @($profileManifest.dsh.profile.bundles)
  if ($bundles -notcontains $pluginPackageName) {
    throw "插件已经写入依赖，但没有加入 DSH bundle 列表：$profileManifestPath"
  }
  $installedManifestPath = Join-Path $dshHomePath 'profiles\web\node_modules\@dsh-external\dsh-agent-rp\package.json'
  if (-not (Test-Path -LiteralPath $installedManifestPath)) {
    throw "插件目录没有正确落盘：$installedManifestPath"
  }
  $installedManifest = Read-JsonFile $installedManifestPath
  if ([string]::IsNullOrWhiteSpace([string]$installedManifest.dsh.bundle.patch)) {
    throw '安装包没有声明 dsh.bundle.patch，DSH 无法把它作为 profile 插件加载。'
  }

  Write-Host "Agent RP $($installedManifest.version) 已就绪，已有角色卡和会话不会被清空。" -ForegroundColor Green
  if ($Start) {
    Write-Host '正在启动 DSH；关闭这个窗口或按 Ctrl+C 会停止本地服务。' -ForegroundColor Cyan
    Invoke-PnpmDlx @($dshRunner, '--profile', 'web')
  } else {
    Write-Host "启动命令：pnpm dlx --reporter append-only '$dshRunner' --profile web"
  }
} catch {
  Write-Host "安装失败：$($_.Exception.Message)" -ForegroundColor Red
  Write-Host '如果卡在“准备 DSH runner”，问题位于 npm registry；可以重试 -ChinaMirror。' -ForegroundColor Yellow
  Write-Host '如果卡在“安装 Agent RP”，问题通常位于 GitHub 下载；切换 npm 镜像不会修复 GitHub 连通性。' -ForegroundColor Yellow
  exit 1
} finally {
  if ($null -eq $previousRegistry) {
    Remove-Item Env:npm_config_registry -ErrorAction SilentlyContinue
  } else {
    $env:npm_config_registry = $previousRegistry
  }
}
