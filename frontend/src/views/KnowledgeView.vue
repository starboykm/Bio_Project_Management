<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { http } from '../api/http';
import { t } from '../i18n';

type UserOption = { id: string; name: string; email: string };
type Category = { id?: string; name: string; description?: string };
type TagRow = { id?: string; name: string; color?: string };
type Attachment = { name: string; url: string; type: string };
type Article = {
  id?: string;
  title: string;
  subtitle?: string;
  content: string;
  richContent?: string;
  markdownContent?: string;
  editorMode: 'rich' | 'markdown';
  category?: string;
  tags: string[];
  authorId?: string;
  collaboratorIds: string[];
  permissionMode: 'readonly' | 'editable' | 'collab' | 'share';
  attachments?: Attachment[];
  updatedAt?: string;
};
type TreeNode = { label: string; type: 'category' | 'article'; id?: string; article?: Article; children?: TreeNode[] };

const articles = ref<Article[]>([]);
const categories = ref<Category[]>([]);
const tags = ref<TagRow[]>([]);
const users = ref<UserOption[]>([]);
const selectedArticle = ref<Article | null>(null);
const editingArticleId = ref<string>();
const categoryDialogVisible = ref(false);
const editingCategoryId = ref<string>();
const richEditor = ref<HTMLDivElement>();

const articleForm = reactive<Article>({
  title: '',
  subtitle: '',
  content: '',
  richContent: '',
  markdownContent: '',
  editorMode: 'rich',
  category: '',
  tags: [],
  collaboratorIds: [],
  permissionMode: 'readonly',
  attachments: [],
});
const tagText = ref('');
const categoryForm = reactive<Category>({ name: '', description: '' });

const treeData = computed<TreeNode[]>(() => {
  const names = Array.from(new Set([...categories.value.map((item) => item.name), ...articles.value.map((item) => item.category || t('knowledge.uncategorized'))]));
  return names.map((name) => ({
    label: name,
    type: 'category',
    id: name,
    children: articles.value
      .filter((article) => (article.category || t('knowledge.uncategorized')) === name)
      .map((article) => ({ label: article.title, type: 'article', id: article.id, article })),
  }));
});

function userName(id?: string) {
  return users.value.find((user) => user.id === id)?.name || '-';
}

function tagNamesFromText() {
  return tagText.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resetArticleForm(category?: string) {
  Object.assign(articleForm, {
    title: '',
    subtitle: '',
    content: '',
    richContent: '',
    markdownContent: '',
    editorMode: 'rich',
    category: category || categories.value[0]?.name || '',
    tags: [],
    collaboratorIds: [],
    permissionMode: 'readonly',
    attachments: [],
  });
  tagText.value = '';
}

function richToMarkdown(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  root.querySelectorAll('img').forEach((img) => img.replaceWith(`![${img.getAttribute('alt') || 'image'}](${img.getAttribute('src') || ''})`));
  root.querySelectorAll('a').forEach((link) => link.replaceWith(`[${link.textContent || ''}](${link.getAttribute('href') || ''})`));
  root.querySelectorAll('h1,h2,h3').forEach((heading) => {
    const level = heading.tagName === 'H1' ? '# ' : heading.tagName === 'H2' ? '## ' : '### ';
    heading.replaceWith(`${level}${heading.textContent || ''}\n`);
  });
  return (root.textContent || '').trim();
}

async function loadArticles() {
  const { data } = await http.get('/knowledge');
  articles.value = data;
  if (!selectedArticle.value && data.length) {
    openEditArticle(data[0]);
  }
}

async function loadCategories() {
  const { data } = await http.get('/knowledge/categories');
  categories.value = data;
}

async function loadTags() {
  const { data } = await http.get('/knowledge/tags');
  tags.value = data;
}

async function loadUsers() {
  const { data } = await http.get('/users');
  users.value = data;
}

async function loadAll() {
  await Promise.all([loadCategories(), loadTags(), loadUsers()]);
  await loadArticles();
}

function onTreeNodeClick(node: TreeNode) {
  if (node.type === 'article' && node.article) {
    openEditArticle(node.article);
  } else if (node.type === 'category') {
    openCreateArticle(node.label === t('knowledge.uncategorized') ? '' : node.label);
  }
}

function openCreateArticle(category?: string) {
  editingArticleId.value = undefined;
  selectedArticle.value = null;
  resetArticleForm(category);
  nextTick(() => {
    if (richEditor.value) richEditor.value.innerHTML = '';
  });
}

function openEditArticle(row: Article) {
  editingArticleId.value = row.id;
  selectedArticle.value = row;
  Object.assign(articleForm, {
    ...row,
    tags: row.tags || [],
    collaboratorIds: row.collaboratorIds || [],
    attachments: row.attachments || [],
    editorMode: 'rich',
    richContent: row.richContent || row.content || '',
    markdownContent: row.markdownContent || richToMarkdown(row.richContent || row.content || ''),
  });
  tagText.value = (row.tags || []).join(', ');
  nextTick(() => {
    if (richEditor.value) richEditor.value.innerHTML = articleForm.richContent || '';
  });
}

function onRichInput() {
  articleForm.richContent = richEditor.value?.innerHTML || '';
  articleForm.markdownContent = richToMarkdown(articleForm.richContent);
}

function queryTagSuggestions(query: string, cb: (items: Array<{ value: string }>) => void) {
  const last = query.split(',').pop()?.trim().toLowerCase() || '';
  cb(tags.value.filter((tag) => !last || tag.name.toLowerCase().includes(last)).map((tag) => ({ value: tag.name })));
}

function selectTagSuggestion(item: { value: string }) {
  const parts = tagText.value.split(',');
  parts[parts.length - 1] = ` ${item.value}`;
  tagText.value = `${parts.map((part) => part.trim()).filter(Boolean).join(', ')}, `;
}

async function uploadFile(event: Event, insertImage: boolean) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<Attachment>('/knowledge/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  articleForm.attachments = [...(articleForm.attachments || []), data];
  if (insertImage) {
    articleForm.richContent = `${articleForm.richContent || ''}<p><img src="${data.url}" alt="${data.name}" /></p>`;
    await nextTick();
    if (richEditor.value) richEditor.value.innerHTML = articleForm.richContent || '';
  }
  (event.target as HTMLInputElement).value = '';
}

async function saveArticle() {
  onRichInput();
  const tagNames = tagNamesFromText();
  const payload = {
    ...articleForm,
    tags: tagNames,
    editorMode: 'rich',
    content: articleForm.richContent || '',
    markdownContent: richToMarkdown(articleForm.richContent || ''),
  };
  if (editingArticleId.value) {
    await http.patch(`/knowledge/${editingArticleId.value}`, payload);
  } else {
    const { data } = await http.post('/knowledge', payload);
    editingArticleId.value = data.id;
  }
  await Promise.all([loadArticles(), loadTags()]);
  ElMessage.success(t('common.saveSuccess'));
}

function openCreateCategory() {
  editingCategoryId.value = undefined;
  Object.assign(categoryForm, { name: '', description: '' });
  categoryDialogVisible.value = true;
}

function openEditCategory(row: Category) {
  editingCategoryId.value = row.id;
  Object.assign(categoryForm, row);
  categoryDialogVisible.value = true;
}

async function saveCategory() {
  if (editingCategoryId.value) {
    await http.patch(`/knowledge/categories/${editingCategoryId.value}`, categoryForm);
  } else {
    await http.post('/knowledge/categories', categoryForm);
  }
  categoryDialogVisible.value = false;
  await loadCategories();
}

async function deleteCategory(row: Category) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(t('common.confirmDelete'), t('common.confirm'), { type: 'warning' });
  } catch {
    return;
  }
  await http.delete(`/knowledge/categories/${row.id}`);
  await Promise.all([loadCategories(), loadArticles()]);
}

onMounted(loadAll);
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('knowledge.title') }}</h1>
        <p>{{ t('knowledge.subtitle') }}</p>
      </div>
      <div class="toolbar-actions">
        <el-button @click="openCreateCategory">{{ t('knowledge.manageCategories') }}</el-button>
        <el-button type="primary" @click="openCreateArticle()">{{ t('knowledge.new') }}</el-button>
      </div>
    </header>

    <section class="knowledge-layout">
      <aside class="work-panel knowledge-tree-panel">
        <el-tree :data="treeData" node-key="id" default-expand-all @node-click="onTreeNodeClick">
          <template #default="{ data }">
            <span class="knowledge-tree-node" :class="{ article: data.type === 'article' }">
              <span>{{ data.type === 'category' ? '[DIR]' : '[DOC]' }}</span>
              <span>{{ data.label }}</span>
            </span>
          </template>
        </el-tree>
        <div class="section-title">{{ t('knowledge.category') }}</div>
        <div class="category-list">
          <div v-for="category in categories" :key="category.id" class="category-row">
            <button type="button" @click="openEditCategory(category)">
              <strong>{{ category.name }}</strong>
              <span>{{ category.description || '-' }}</span>
            </button>
            <el-button size="small" type="danger" plain @click="deleteCategory(category)">{{ t('common.delete') }}</el-button>
          </div>
        </div>
      </aside>

      <main class="work-panel knowledge-editor-panel">
        <el-form :model="articleForm" label-position="top">
          <div class="editor-title-row">
            <el-form-item :label="t('knowledge.articleTitle')" class="editor-title-input"><el-input v-model="articleForm.title" /></el-form-item>
            <el-button type="primary" @click="saveArticle">{{ t('common.save') }}</el-button>
          </div>
          <el-form-item :label="t('knowledge.subtitleLabel')"><el-input v-model="articleForm.subtitle" /></el-form-item>
          <div class="editor-grid">
            <el-form-item :label="t('knowledge.category')">
              <el-select v-model="articleForm.category" filterable allow-create style="width: 100%">
                <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.name" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('knowledge.permission')">
              <el-select v-model="articleForm.permissionMode" style="width: 100%">
                <el-option :label="t('knowledge.permission.readonly')" value="readonly" />
                <el-option :label="t('knowledge.permission.editable')" value="editable" />
                <el-option :label="t('knowledge.permission.collab')" value="collab" />
                <el-option :label="t('knowledge.permission.share')" value="share" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item :label="t('knowledge.collaborators')">
            <el-select v-model="articleForm.collaboratorIds" multiple filterable style="width: 100%">
              <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('knowledge.tags')">
            <el-autocomplete
              v-model="tagText"
              style="width: 100%"
              :fetch-suggestions="queryTagSuggestions"
              :placeholder="t('knowledge.tagPlaceholder')"
              @select="selectTagSuggestion"
            />
          </el-form-item>
          <div class="editor-toolbar">
            <span>{{ t('knowledge.richText') }}</span>
            <label class="upload-button">
              {{ t('knowledge.insertImage') }}
              <input type="file" accept="image/*" @change="(event) => uploadFile(event, true)" />
            </label>
            <label class="upload-button">
              {{ t('knowledge.uploadAttachment') }}
              <input type="file" @change="(event) => uploadFile(event, false)" />
            </label>
            <span class="muted-line">{{ t('knowledge.author') }}: {{ userName(articleForm.authorId) }}</span>
          </div>
          <div ref="richEditor" class="rich-editor knowledge-page-editor" contenteditable="true" @input="onRichInput" />
          <div v-if="articleForm.attachments?.length" class="attachment-list">
            <a v-for="item in articleForm.attachments" :key="item.url" :href="item.url" target="_blank">{{ item.name }}</a>
          </div>
        </el-form>
      </main>
    </section>

    <el-dialog v-model="categoryDialogVisible" :title="editingCategoryId ? t('knowledge.editCategory') : t('knowledge.newCategory')" width="420px">
      <el-form :model="categoryForm" label-position="top">
        <el-form-item :label="t('common.name')"><el-input v-model="categoryForm.name" /></el-form-item>
        <el-form-item :label="t('common.description')"><el-input v-model="categoryForm.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCategory">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
