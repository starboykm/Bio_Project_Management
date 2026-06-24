<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import {
  Archive,
  Bold,
  BookOpen,
  ChevronDown,
  Code2,
  Database,
  Download,
  Edit3,
  FilePlus2,
  FlaskConical,
  Folder,
  FolderPlus,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Leaf,
  Library,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Undo2,
} from '@lucide/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, type Component } from 'vue';
import { http } from '../api/http';
import { t } from '../i18n';

type UserOption = { id: string; name: string; email: string };
type Category = { id?: string; name: string; description?: string; parentId?: string; icon?: string };
type TagRow = { id?: string; name: string; color?: string };
type Attachment = { name: string; url: string; type: string };
type CollaboratorPermission = { userId: string; permission: 'readonly' | 'editable' | 'collab' };
type BlockFormat = 'paragraph' | 'heading1' | 'heading2' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock';
type Article = {
  id?: string;
  title: string;
  content: string;
  richContent?: string;
  markdownContent?: string;
  editorMode: 'rich' | 'markdown';
  category?: string;
  categoryId?: string;
  tags: string[];
  authorId?: string;
  collaboratorIds: string[];
  collaboratorPermissions?: CollaboratorPermission[];
  visibilityMode: 'all' | 'private' | 'selected';
  visibleUserIds: string[];
  permissionMode: 'readonly' | 'editable' | 'collab' | 'share';
  attachments?: Attachment[];
  updatedAt?: string;
};
type TreeNode = {
  key: string;
  label: string;
  type: 'category' | 'article';
  id?: string;
  category?: Category;
  article?: Article;
  children?: TreeNode[];
};

const articles = ref<Article[]>([]);
const categories = ref<Category[]>([]);
const tags = ref<TagRow[]>([]);
const users = ref<UserOption[]>([]);
const selectedArticle = ref<Article | null>(null);
const selectedCategoryId = ref<string>();
const editingArticleId = ref<string>();
const articleMode = ref<'view' | 'edit'>('view');
const categoryDialogVisible = ref(false);
const editingCategoryId = ref<string>();
const categoryParentId = ref<string>();
const editorTemplate = ref<'simple' | 'notion'>('simple');
const notionBlockMenuOpen = ref(false);
const savingArticle = ref(false);
const exportingArticle = ref(false);
const articleExportRef = ref<HTMLElement>();

const categoryIconOptions: Array<{ value: string; labelKey: string; component: Component }> = [
  { value: 'folder', labelKey: 'knowledge.icon.folder', component: Folder },
  { value: 'book', labelKey: 'knowledge.icon.book', component: Library },
  { value: 'experiment', labelKey: 'knowledge.icon.experiment', component: FlaskConical },
  { value: 'leaf', labelKey: 'knowledge.icon.leaf', component: Leaf },
  { value: 'database', labelKey: 'knowledge.icon.database', component: Database },
  { value: 'archive', labelKey: 'knowledge.icon.archive', component: Archive },
];
const categoryIconMap = new Map(categoryIconOptions.map((item) => [item.value, item.component]));

const articleForm = reactive<Article>({
  title: '',
  content: '',
  richContent: '',
  markdownContent: '',
  editorMode: 'rich',
  category: '',
  categoryId: '',
  tags: [],
  collaboratorIds: [],
  collaboratorPermissions: [],
  visibilityMode: 'all',
  visibleUserIds: [],
  permissionMode: 'readonly',
  attachments: [],
});
const tagText = ref('');
const categoryForm = reactive<Category>({ name: '', description: '', parentId: undefined, icon: 'folder' });

const editor = useEditor({
  extensions: [
    StarterKit,
    Image.configure({ inline: false, allowBase64: false }),
    Link.configure({ openOnClick: false }),
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'tiptap-editor',
    },
  },
  onUpdate: ({ editor }) => {
    articleForm.richContent = editor.getHTML();
    articleForm.content = articleForm.richContent;
    articleForm.markdownContent = editor.getText();
  },
});

const categoryMap = computed(() => new Map(categories.value.filter((item) => item.id).map((item) => [item.id, item])));

const treeData = computed<TreeNode[]>(() => {
  const byParent = new Map<string, Category[]>();
  categories.value.forEach((category) => {
    const parentKey = category.parentId || 'root';
    byParent.set(parentKey, [...(byParent.get(parentKey) || []), category]);
  });

  const articleNodesByCategory = new Map<string, TreeNode[]>();
  articles.value.forEach((article) => {
    const key = article.categoryId || `name:${article.category || ''}`;
    articleNodesByCategory.set(key, [
      ...(articleNodesByCategory.get(key) || []),
      {
        key: `article:${article.id}`,
        label: article.title,
        type: 'article',
        id: article.id,
        article,
      },
    ]);
  });

  const buildCategoryNode = (category: Category): TreeNode => {
    const id = category.id || category.name;
    const childCategories = (byParent.get(id) || []).map(buildCategoryNode);
    const articleNodes = [...(articleNodesByCategory.get(id) || []), ...(articleNodesByCategory.get(`name:${category.name}`) || [])];
    return {
      key: `category:${id}`,
      label: category.name,
      type: 'category',
      id,
      category,
      children: [...childCategories, ...articleNodes],
    };
  };

  const rootNodes = (byParent.get('root') || []).map(buildCategoryNode);
  const uncategorized = articleNodesByCategory.get('name:') || [];
  return uncategorized.length
    ? [...rootNodes, { key: 'category:uncategorized', label: t('knowledge.uncategorized'), type: 'category', children: uncategorized }]
    : rootNodes;
});

const selectedCategoryName = computed(() => categoryMap.value.get(selectedCategoryId.value || '')?.name || selectedArticle.value?.category || '');

function categoryIcon(category?: Category) {
  return categoryIconMap.get(category?.icon || 'folder') || Folder;
}

function userName(id?: string) {
  return users.value.find((user) => user.id === id)?.name || '-';
}

function categoryName(article?: Article | null) {
  if (!article) return '-';
  return categoryMap.value.get(article.categoryId || '')?.name || article.category || t('knowledge.uncategorized');
}

function tagNamesFromText() {
  return tagText.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function syncEditorContent(html: string) {
  nextTick(() => editor.value?.commands.setContent(html || '', { emitUpdate: false }));
}

function applyBlockFormat(format: BlockFormat) {
  const chain = editor.value?.chain().focus();
  if (!chain) return;
  if (format === 'paragraph') chain.setParagraph().run();
  if (format === 'heading1') chain.toggleHeading({ level: 1 }).run();
  if (format === 'heading2') chain.toggleHeading({ level: 2 }).run();
  if (format === 'bulletList') chain.toggleBulletList().run();
  if (format === 'orderedList') chain.toggleOrderedList().run();
  if (format === 'blockquote') chain.toggleBlockquote().run();
  if (format === 'codeBlock') chain.toggleCodeBlock().run();
  notionBlockMenuOpen.value = false;
}

function handleEditorKeydown(event: KeyboardEvent) {
  if (editorTemplate.value !== 'notion' || !editor.value) return false;
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;
  let handled = true;

  if (mod && !event.shiftKey && key === 'b') editor.value.chain().focus().toggleBold().run();
  else if (mod && !event.shiftKey && key === 'i') editor.value.chain().focus().toggleItalic().run();
  else if (mod && event.shiftKey && key === 's') editor.value.chain().focus().toggleStrike().run();
  else if (mod && event.altKey && key === '1') editor.value.chain().focus().toggleHeading({ level: 1 }).run();
  else if (mod && event.altKey && key === '2') editor.value.chain().focus().toggleHeading({ level: 2 }).run();
  else if (mod && event.shiftKey && key === '7') editor.value.chain().focus().toggleOrderedList().run();
  else if (mod && event.shiftKey && key === '8') editor.value.chain().focus().toggleBulletList().run();
  else if (mod && event.shiftKey && key === '9') editor.value.chain().focus().toggleBlockquote().run();
  else if (mod && !event.shiftKey && key === 'k') void editLink();
  else if (mod && !event.shiftKey && key === 's') void saveArticle();
  else if (event.key === '/' && editor.value.state.selection.$from.parent.textContent.length === 0) notionBlockMenuOpen.value = true;
  else if (event.key === 'Escape') notionBlockMenuOpen.value = false;
  else handled = false;

  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
  return handled;
}

function requestErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join('；');
  return message || (error instanceof Error ? error.message : fallback);
}

async function editLink() {
  const currentUrl = editor.value?.getAttributes('link').href || '';
  try {
    const { value } = await ElMessageBox.prompt(t('knowledge.linkAddress'), t('knowledge.insertLink'), {
      inputValue: currentUrl,
      inputPlaceholder: 'https://',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });
    if (!value) {
      editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
  } catch {
    // Prompt cancelled.
  }
}

function resetArticleForm(category?: Category) {
  Object.assign(articleForm, {
    title: '',
    content: '',
    richContent: '',
    markdownContent: '',
    editorMode: 'rich',
    category: category?.name || '',
    categoryId: category?.id || '',
    tags: [],
    collaboratorIds: [],
    collaboratorPermissions: [],
    visibilityMode: 'all',
    visibleUserIds: [],
    permissionMode: 'readonly',
    attachments: [],
  });
  tagText.value = '';
  syncEditorContent('');
}

async function loadArticles() {
  const { data } = await http.get('/knowledge');
  articles.value = data;
  if (!selectedArticle.value && data.length) {
    openViewArticle(data[0]);
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
    openViewArticle(node.article);
    return;
  }
  selectedCategoryId.value = node.category?.id;
}

function openCreateArticle(category?: Category) {
  editingArticleId.value = undefined;
  selectedArticle.value = null;
  selectedCategoryId.value = category?.id;
  articleMode.value = 'edit';
  editorTemplate.value = 'simple';
  notionBlockMenuOpen.value = false;
  resetArticleForm(category);
}

function applyArticleToForm(row: Article) {
  const category = categoryMap.value.get(row.categoryId || '');
  Object.assign(articleForm, {
    ...row,
    tags: row.tags || [],
    categoryId: row.categoryId || category?.id || '',
    category: category?.name || row.category || '',
    collaboratorIds: row.collaboratorIds || [],
    collaboratorPermissions: normalizeCollaboratorPermissions(row.collaboratorIds || [], row.collaboratorPermissions || []),
    visibleUserIds: row.visibleUserIds || [],
    attachments: row.attachments || [],
    editorMode: 'rich',
    richContent: row.richContent || row.content || '',
    markdownContent: row.markdownContent || '',
  });
  tagText.value = (row.tags || []).join(', ');
}

function openViewArticle(row: Article) {
  editingArticleId.value = row.id;
  selectedArticle.value = row;
  selectedCategoryId.value = row.categoryId;
  articleMode.value = 'view';
  applyArticleToForm(row);
}

function openEditArticle(row = selectedArticle.value) {
  if (!row) return;
  editingArticleId.value = row.id;
  articleMode.value = 'edit';
  editorTemplate.value = 'simple';
  notionBlockMenuOpen.value = false;
  applyArticleToForm(row);
  syncEditorContent(articleForm.richContent || articleForm.content || '');
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

function normalizeCollaboratorPermissions(ids: string[], rows: CollaboratorPermission[]) {
  return ids.map((userId) => rows.find((row) => row.userId === userId) || { userId, permission: 'editable' as const });
}

function onCollaboratorsChange(ids: string[]) {
  articleForm.collaboratorPermissions = normalizeCollaboratorPermissions(ids, articleForm.collaboratorPermissions || []);
  articleForm.visibleUserIds = Array.from(new Set([...(articleForm.visibleUserIds || []), ...ids]));
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
    editor.value?.chain().focus().setImage({ src: data.url, alt: data.name }).run();
  }
  (event.target as HTMLInputElement).value = '';
}

async function saveArticle() {
  if (savingArticle.value) return;
  if (!articleForm.title.trim()) {
    ElMessage.warning(t('knowledge.titleRequired'));
    return;
  }
  const category = categoryMap.value.get(articleForm.categoryId || '');
  const tagNames = tagNamesFromText();
  const html = editor.value?.getHTML() || articleForm.richContent || '';
  const payload = {
    title: articleForm.title.trim(),
    content: html,
    richContent: html,
    markdownContent: editor.value?.getText() || '',
    editorMode: 'rich' as const,
    category: category?.name || articleForm.category,
    categoryId: articleForm.categoryId || undefined,
    tags: tagNames,
    collaboratorIds: articleForm.collaboratorIds || [],
    collaboratorPermissions: normalizeCollaboratorPermissions(articleForm.collaboratorIds || [], articleForm.collaboratorPermissions || []),
    visibilityMode: articleForm.visibilityMode,
    visibleUserIds: articleForm.visibilityMode === 'selected' ? articleForm.visibleUserIds || [] : [],
    permissionMode: articleForm.permissionMode,
    attachments: articleForm.attachments || [],
  };
  savingArticle.value = true;
  try {
    let savedArticle: Article;
    if (editingArticleId.value) {
      const { data } = await http.patch(`/knowledge/${editingArticleId.value}`, payload, { timeout: 15_000 });
      savedArticle = data;
    } else {
      const { data } = await http.post('/knowledge', payload, { timeout: 15_000 });
      savedArticle = data;
    }
    articles.value = [savedArticle, ...articles.value.filter((article) => article.id !== savedArticle.id)];
    openViewArticle(savedArticle);
    ElMessage.success(t('common.saveSuccess'));
    void Promise.allSettled([loadArticles(), loadTags()]);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, t('common.saveFailed')));
  } finally {
    savingArticle.value = false;
  }
}

function safeFileName(title: string) {
  return title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'knowledge-article';
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function exportHtml(article: Article) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = article.richContent || article.content || '';
  wrapper.querySelectorAll('img').forEach((image) => {
    image.src = new URL(image.getAttribute('src') || '', window.location.origin).href;
  });
  return wrapper.innerHTML;
}

async function exportArticle(format: 'pdf' | 'md' | 'docx') {
  const article = selectedArticle.value;
  if (!article) return;
  exportingArticle.value = true;
  const fileName = safeFileName(article.title);
  try {
    if (format === 'md') {
      const { default: TurndownService } = await import('turndown');
      const markdown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' }).turndown(exportHtml(article));
      downloadBlob(new Blob([`# ${article.title}\n\n${markdown}\n`], { type: 'text/markdown;charset=utf-8' }), `${fileName}.md`);
    } else if (format === 'docx') {
      const { asBlob } = await import('html-docx-js-typescript');
      const html = `<!doctype html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;line-height:1.7;color:#27313f}h1{font-size:28px}img{max-width:100%}blockquote{border-left:3px solid #13a36f;padding-left:12px;color:#596473}code{background:#f2f4f6;padding:2px 4px}</style></head><body><h1>${article.title.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] || char)}</h1>${exportHtml(article)}</body></html>`;
      const blob = (await asBlob(html, { orientation: 'portrait' })) as Blob;
      downloadBlob(blob, `${fileName}.docx`);
    } else {
      await nextTick();
      if (!articleExportRef.value) throw new Error(t('knowledge.exportFailed'));
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin: 12,
          filename: `${fileName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(articleExportRef.value)
        .save();
    }
    ElMessage.success(t('knowledge.exportSuccess'));
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, t('knowledge.exportFailed')));
  } finally {
    exportingArticle.value = false;
  }
}

function openCreateCategory(parent?: Category) {
  editingCategoryId.value = undefined;
  categoryParentId.value = parent?.id;
  Object.assign(categoryForm, { name: '', description: '', parentId: parent?.id, icon: 'folder' });
  categoryDialogVisible.value = true;
}

function openEditCategory(row: Category) {
  editingCategoryId.value = row.id;
  categoryParentId.value = row.parentId;
  Object.assign(categoryForm, row);
  categoryDialogVisible.value = true;
}

async function saveCategory() {
  const payload = { name: categoryForm.name, description: categoryForm.description, parentId: categoryParentId.value, icon: categoryForm.icon || 'folder' };
  if (editingCategoryId.value) {
    await http.patch(`/knowledge/categories/${editingCategoryId.value}`, payload);
  } else {
    await http.post('/knowledge/categories', payload);
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
onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('knowledge.title') }}</h1>
        <p>{{ t('knowledge.subtitle') }}</p>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="FolderPlus" @click="openCreateCategory()">{{ t('knowledge.newCategory') }}</el-button>
        <el-button type="primary" :icon="FilePlus2" @click="openCreateArticle(categoryMap.get(selectedCategoryId || ''))">{{ t('knowledge.new') }}</el-button>
      </div>
    </header>

    <section class="knowledge-layout">
      <aside class="work-panel knowledge-tree-panel">
        <div class="knowledge-tree-title">
          <span>{{ t('knowledge.category') }}</span>
          <el-button text :icon="Plus" @click="openCreateCategory()" />
        </div>
        <el-tree :data="treeData" node-key="key" default-expand-all highlight-current @node-click="onTreeNodeClick">
          <template #default="{ data }">
            <span class="knowledge-tree-node" :class="{ article: data.type === 'article' }">
              <span class="knowledge-tree-label">
                <BookOpen v-if="data.type === 'article'" :size="15" />
                <component :is="categoryIcon(data.category)" v-else class="category-custom-icon" :size="16" />
                <span>{{ data.label }}</span>
              </span>
              <span v-if="data.type === 'category' && data.category" class="knowledge-tree-actions">
                <el-button text :icon="FolderPlus" @click.stop="openCreateCategory(data.category)" />
                <el-button text :icon="FilePlus2" @click.stop="openCreateArticle(data.category)" />
                <el-button text :icon="Pencil" @click.stop="openEditCategory(data.category)" />
                <el-button text type="danger" :icon="Trash2" @click.stop="deleteCategory(data.category)" />
              </span>
            </span>
          </template>
        </el-tree>
      </aside>

      <main class="work-panel knowledge-editor-panel">
        <template v-if="articleMode === 'view' && selectedArticle">
          <div class="knowledge-view-actions">
            <el-dropdown trigger="click" @command="exportArticle">
              <el-button :loading="exportingArticle" :icon="Download">
                {{ t('knowledge.export') }}<ChevronDown :size="14" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pdf">PDF</el-dropdown-item>
                  <el-dropdown-item command="md">Markdown (.md)</el-dropdown-item>
                  <el-dropdown-item command="docx">Word (.docx)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="primary" :icon="Edit3" @click="openEditArticle()">{{ t('common.edit') }}</el-button>
          </div>
          <div ref="articleExportRef" class="knowledge-export-document">
            <div class="knowledge-view-header">
              <div>
                <h2>{{ selectedArticle.title }}</h2>
                <p>{{ categoryName(selectedArticle) }} · {{ t('knowledge.author') }}: {{ userName(selectedArticle.authorId) }}</p>
              </div>
            </div>
            <div class="knowledge-meta-line">
              <el-tag v-for="tag in selectedArticle.tags" :key="tag" effect="plain">{{ tag }}</el-tag>
              <el-tag type="info" effect="plain">{{ selectedArticle.visibilityMode }}</el-tag>
            </div>
            <article class="knowledge-article-body" v-html="selectedArticle.richContent || selectedArticle.content" />
            <div v-if="selectedArticle.attachments?.length" class="attachment-list">
              <a v-for="item in selectedArticle.attachments" :key="item.url" :href="item.url" target="_blank">{{ item.name }}</a>
            </div>
          </div>
        </template>

        <el-form v-else-if="articleMode === 'edit'" :model="articleForm" label-position="top">
          <div class="editor-title-row">
            <el-form-item :label="t('knowledge.articleTitle')" class="editor-title-input"><el-input v-model="articleForm.title" /></el-form-item>
            <el-button type="primary" :loading="savingArticle" @click="saveArticle">{{ t('common.save') }}</el-button>
          </div>
          <div class="editor-grid">
            <el-form-item :label="t('knowledge.category')">
              <el-select v-model="articleForm.categoryId" filterable style="width: 100%">
                <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="显示范围">
              <el-select v-model="articleForm.visibilityMode" style="width: 100%">
                <el-option label="全员" value="all" />
                <el-option label="个人" value="private" />
                <el-option label="部分用户可见" value="selected" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item v-if="articleForm.visibilityMode === 'selected'" label="可见用户">
            <el-select v-model="articleForm.visibleUserIds" multiple filterable style="width: 100%">
              <el-option v-for="user in users" :key="user.id" :label="`${user.name} (${user.email})`" :value="user.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('knowledge.collaborators')">
            <el-select v-model="articleForm.collaboratorIds" multiple filterable style="width: 100%" @change="onCollaboratorsChange">
              <el-option v-for="user in users" :key="user.id" :label="`${user.name} (${user.email})`" :value="user.id" />
            </el-select>
          </el-form-item>
          <div v-if="articleForm.collaboratorPermissions?.length" class="collaborator-permission-list">
            <div v-for="row in articleForm.collaboratorPermissions" :key="row.userId" class="collaborator-permission-row">
              <span>{{ userName(row.userId) }}</span>
              <el-select v-model="row.permission" size="small">
                <el-option label="只读" value="readonly" />
                <el-option label="可编辑" value="editable" />
                <el-option label="协同创作" value="collab" />
              </el-select>
            </div>
          </div>
          <el-form-item :label="t('knowledge.tags')">
            <el-autocomplete
              v-model="tagText"
              style="width: 100%"
              :fetch-suggestions="queryTagSuggestions"
              :placeholder="t('knowledge.tagPlaceholder')"
              @select="selectTagSuggestion"
            />
          </el-form-item>
          <div class="knowledge-editor-options">
            <div>
              <span class="editor-option-label">{{ t('knowledge.editorTemplate') }}</span>
              <el-segmented
                v-model="editorTemplate"
                :options="[
                  { label: t('knowledge.template.simple'), value: 'simple' },
                  { label: t('knowledge.template.notion'), value: 'notion' },
                ]"
              />
            </div>
            <div class="knowledge-upload-actions">
            <label class="upload-button">
                <ImagePlus :size="15" />{{ t('knowledge.insertImage') }}
              <input type="file" accept="image/*" @change="(event) => uploadFile(event, true)" />
            </label>
            <label class="upload-button">
                <Paperclip :size="15" />{{ t('knowledge.uploadAttachment') }}
              <input type="file" @change="(event) => uploadFile(event, false)" />
            </label>
            </div>
          </div>
          <div v-if="editorTemplate === 'simple'" class="editor-toolbar tiptap-toolbar">
            <el-tooltip :content="t('knowledge.undo')"><el-button :icon="Undo2" @click="editor?.chain().focus().undo().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.redo')"><el-button :icon="Redo2" @click="editor?.chain().focus().redo().run()" /></el-tooltip>
            <span class="toolbar-divider" />
            <el-tooltip :content="t('knowledge.bold')"><el-button :icon="Bold" :type="editor?.isActive('bold') ? 'primary' : ''" @click="editor?.chain().focus().toggleBold().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.italic')"><el-button :icon="Italic" :type="editor?.isActive('italic') ? 'primary' : ''" @click="editor?.chain().focus().toggleItalic().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.strike')"><el-button :icon="Strikethrough" :type="editor?.isActive('strike') ? 'primary' : ''" @click="editor?.chain().focus().toggleStrike().run()" /></el-tooltip>
            <span class="toolbar-divider" />
            <el-tooltip content="H1"><el-button :icon="Heading1" :type="editor?.isActive('heading', { level: 1 }) ? 'primary' : ''" @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" /></el-tooltip>
            <el-tooltip content="H2"><el-button :icon="Heading2" :type="editor?.isActive('heading', { level: 2 }) ? 'primary' : ''" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.bulletList')"><el-button :icon="List" :type="editor?.isActive('bulletList') ? 'primary' : ''" @click="editor?.chain().focus().toggleBulletList().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.orderedList')"><el-button :icon="ListOrdered" :type="editor?.isActive('orderedList') ? 'primary' : ''" @click="editor?.chain().focus().toggleOrderedList().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.quote')"><el-button :icon="Quote" :type="editor?.isActive('blockquote') ? 'primary' : ''" @click="editor?.chain().focus().toggleBlockquote().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.codeBlock')"><el-button :icon="Code2" :type="editor?.isActive('codeBlock') ? 'primary' : ''" @click="editor?.chain().focus().toggleCodeBlock().run()" /></el-tooltip>
            <el-tooltip :content="t('knowledge.insertLink')"><el-button :icon="Link2" :type="editor?.isActive('link') ? 'primary' : ''" @click="editLink" /></el-tooltip>
          </div>
          <div class="knowledge-editor-surface" :class="`is-${editorTemplate}`" @keydown.capture="handleEditorKeydown">
            <BubbleMenu v-if="editor && editorTemplate === 'notion'" :editor="editor" :options="{ placement: 'top' }">
              <div class="notion-bubble-menu">
                <el-button :title="`${t('knowledge.bold')} (Ctrl+B)`" :icon="Bold" :type="editor.isActive('bold') ? 'primary' : ''" @mousedown.prevent @click="editor.chain().focus().toggleBold().run()" />
                <el-button :title="`${t('knowledge.italic')} (Ctrl+I)`" :icon="Italic" :type="editor.isActive('italic') ? 'primary' : ''" @mousedown.prevent @click="editor.chain().focus().toggleItalic().run()" />
                <el-button :title="`${t('knowledge.strike')} (Ctrl+Shift+S)`" :icon="Strikethrough" :type="editor.isActive('strike') ? 'primary' : ''" @mousedown.prevent @click="editor.chain().focus().toggleStrike().run()" />
                <el-button :title="`${t('knowledge.insertLink')} (Ctrl+K)`" :icon="Link2" :type="editor.isActive('link') ? 'primary' : ''" @mousedown.prevent @click="editLink" />
              </div>
            </BubbleMenu>
            <div v-if="editor && editorTemplate === 'notion'" class="notion-block-menu-anchor">
              <el-button
                :title="t('knowledge.blockMenu')"
                :icon="Plus"
                circle
                @mousedown.prevent
                @click.stop="notionBlockMenuOpen = !notionBlockMenuOpen"
              />
              <div v-if="notionBlockMenuOpen" class="notion-block-options" @mousedown.prevent>
                <el-button :title="t('knowledge.paragraph')" :icon="Pilcrow" @click.stop="applyBlockFormat('paragraph')" />
                <el-button title="H1 (Ctrl+Alt+1)" :icon="Heading1" @click.stop="applyBlockFormat('heading1')" />
                <el-button title="H2 (Ctrl+Alt+2)" :icon="Heading2" @click.stop="applyBlockFormat('heading2')" />
                <el-button :title="`${t('knowledge.bulletList')} (Ctrl+Shift+8)`" :icon="List" @click.stop="applyBlockFormat('bulletList')" />
                <el-button :title="`${t('knowledge.orderedList')} (Ctrl+Shift+7)`" :icon="ListOrdered" @click.stop="applyBlockFormat('orderedList')" />
                <el-button :title="`${t('knowledge.quote')} (Ctrl+Shift+9)`" :icon="Quote" @click.stop="applyBlockFormat('blockquote')" />
                <el-button :title="t('knowledge.codeBlock')" :icon="Code2" @click.stop="applyBlockFormat('codeBlock')" />
              </div>
            </div>
            <EditorContent
              :editor="editor"
              class="knowledge-page-editor"
              @mousedown="notionBlockMenuOpen = false"
            />
          </div>
          <span class="muted-line knowledge-editor-author">{{ t('knowledge.author') }}: {{ userName(articleForm.authorId) }}</span>
          <div v-if="articleForm.attachments?.length" class="attachment-list">
            <a v-for="item in articleForm.attachments" :key="item.url" :href="item.url" target="_blank">{{ item.name }}</a>
          </div>
        </el-form>

        <el-empty v-if="articleMode === 'view' && !selectedArticle" description="选择一篇知识文章，或从左侧分类新增文章" />
      </main>
    </section>

    <el-dialog v-model="categoryDialogVisible" :title="editingCategoryId ? t('knowledge.editCategory') : t('knowledge.newCategory')" width="420px">
      <el-form :model="categoryForm" label-position="top">
        <el-form-item :label="t('common.name')"><el-input v-model="categoryForm.name" /></el-form-item>
        <el-form-item :label="t('common.description')"><el-input v-model="categoryForm.description" type="textarea" /></el-form-item>
        <el-form-item :label="t('knowledge.categoryIcon')">
          <el-select v-model="categoryForm.icon" style="width: 100%">
            <el-option v-for="item in categoryIconOptions" :key="item.value" :label="t(item.labelKey)" :value="item.value">
              <span class="category-icon-option"><component :is="item.component" :size="16" />{{ t(item.labelKey) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCategory">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
