<script setup lang="ts">
import { t } from '../i18n';
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('report.title') }}</h1>
        <p>{{ t('report.subtitle') }}</p>
      </div>
      <el-button type="primary">{{ t('report.generate') }}</el-button>
    </header>

    <section class="split-grid">
      <div class="work-panel">
        <h2>{{ t('report.projectHealth') }}</h2>
        <el-progress :percentage="72" :stroke-width="14" />
        <el-divider />
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="t('report.active')">5 {{ t('nav.project') }}</el-descriptions-item>
          <el-descriptions-item :label="t('report.attention')">2 {{ t('nav.project') }}</el-descriptions-item>
          <el-descriptions-item :label="t('report.completion')">72%</el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="work-panel">
        <h2>{{ t('report.crmFunnel') }}</h2>
        <el-timeline>
          <el-timeline-item :timestamp="t('report.lead')">16</el-timeline-item>
          <el-timeline-item :timestamp="t('report.trial')">6</el-timeline-item>
          <el-timeline-item :timestamp="t('report.proposal')">3</el-timeline-item>
          <el-timeline-item :timestamp="t('report.closed')">2</el-timeline-item>
        </el-timeline>
      </div>
    </section>
  </div>
</template>
