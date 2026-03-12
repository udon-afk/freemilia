# reia-shell scaffold patch (for freemilia workflows)

このパッチは `products/airi` リポジトリ内で作成した以下コミットを再適用するためのものです。

- source commit: `bd66640`
- message: `feat: scaffold reia shell web+pwa and gateway mock`

## 使い方

```bash
cd products/airi
git am ../ops/patches/reia-shell-scaffold-bd66640.patch
```

コンフリクトが出た場合:

```bash
git am --abort
# 手動で差分を反映後、通常コミット
```

適用後、以下で確認:

```bash
pnpm install
pnpm dev:reia
```
